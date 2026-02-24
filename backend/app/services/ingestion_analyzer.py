import pandas as pd
import os
from typing import Dict, Any, List
from datetime import datetime
import io

class IngestionAnalyzer:
    def __init__(self):
        pass

    def _generate_logs(self, summary: str, details: List[Dict], errors: List[str]) -> str:
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_lines = [f"[{timestamp}] ANALYSIS STARTED", f"[{timestamp}] SUMMARY: {summary}", ""]
        
        if errors:
            log_lines.append("!!! ERRORS DETECTED !!!")
            for e in errors:
                log_lines.append(f"[ERROR] {e}")
            log_lines.append("")

        if details:
            log_lines.append("--- DETAILS ---")
            for d in details:
                log_lines.append(f"Entity: {d.get('entity', 'N/A')}")
                log_lines.append(f"  - Variable: {d.get('variable', 'N/A')}")
                log_lines.append(f"  - Range: {d.get('range', 'N/A')}")
                log_lines.append(f"  - Rows: {d.get('count', 0)}")
                log_lines.append(f"  - Status: {d.get('status', 'N/A')}")
                log_lines.append("")
        else:
            log_lines.append("No details available.")

        log_lines.append(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] ANALYSIS COMPLETED")
        return "\n".join(log_lines)

    async def analyze_file(self, file_content: bytes, filename: str, file_type: str) -> Dict[str, Any]:
        """
        Main entry point for analysis.
        Returns a report structure:
        {
            "status": "success/warning/error",
            "summary": "Found X entities...",
            "details": [...],
            "errors": [],
            "logs": "Trace..."
        }
        """
        report = {
            "status": "error",
            "summary": "Analysis failed",
            "details": [],
            "errors": [],
            "logs": ""
        }

        try:
            if file_type == "datatable":
                report = self._analyze_datatable(file_content)
            elif file_type == "pluie":
                report = self._analyze_rainfall_excel(file_content)
            elif file_type == "abhs": # HEC-HMS Results
                report = self._analyze_hms_excel(file_content)
            else:
                report["errors"].append(f"Unknown file type: {file_type}")
                report["logs"] = self._generate_logs(report["summary"], [], report["errors"])
        
        except Exception as e:
            report["errors"].append(f"Critical analysis error: {str(e)}")
            report["logs"] = self._generate_logs("Critical Error", [], report["errors"])
        
        return report

    def _analyze_datatable(self, content: bytes) -> Dict[str, Any]:
        """Analyzes DataTable.csv (Station Observations)"""
        try:
            # Assuming CSV with header in first row
            df = pd.read_csv(io.BytesIO(content))
            
            # Simple heuristics: Columns are station names or codes
            # Date column expected?
            date_col = None
            for col in df.columns:
                if 'date' in col.lower() or 'time' in col.lower():
                    date_col = col
                    break
            
            if not date_col:
                errors = ["No Date/Time column found in CSV"]
                return {
                    "status": "error", 
                    "summary": "Error", 
                    "details": [], 
                    "errors": errors,
                    "logs": self._generate_logs("Error parsing CSV", [], errors)
                }

            # Try to parse dates to get range
            try:
                df[date_col] = pd.to_datetime(df[date_col])
                start_date = df[date_col].min()
                end_date = df[date_col].max()
                date_range_str = f"{start_date} - {end_date}"
            except:
                date_range_str = "Could not parse dates"

            details = []
            # Stations are other columns
            stations = [c for c in df.columns if c != date_col]
            
            summary = f"Found {len(stations)} stations. Range: {date_range_str}"
            
            for station in stations:
                # Count non-nulls
                count = df[station].count()
                details.append({
                    "entity": station,
                    "variable": "Observation",
                    "range": date_range_str,
                    "count": int(count),
                    "status": "Ready",
                    "action": "Append/Update"
                })

            return {
                "status": "success", 
                "summary": summary, 
                "details": details, 
                "errors": [],
                "logs": self._generate_logs(summary, details, [])
            }

        except Exception as e:
            errors = [str(e)]
            return {
                "status": "error",
                "summary": "Error parsing CSV", 
                "details": [], 
                "errors": errors,
                "logs": self._generate_logs("Error parsing CSV", [], errors)
            }

    def _analyze_rainfall_excel(self, content: bytes) -> Dict[str, Any]:
        """Analyzes data_pluie_horaire.xlsx"""
        try:
            # Load workbook
            xl = pd.ExcelFile(io.BytesIO(content))
            sheet_names = xl.sheet_names
            
            details = []
            errors = []
            summary_parts = []

            # Expected sheets: Synthesis, Obs History, AROME, ECMWF (names might vary, using heuristics)
            
            for sheet in sheet_names:
                df = parse_excel_safe(xl, sheet)
                if df is None:
                    errors.append(f"Could not read sheet {sheet}")
                    continue
                
                rows = len(df)
                cols = len(df.columns)
                
                # Try to identify date column
                date_range = "Unknown"
                if not df.empty:
                    # Look for date column
                    date_col = next((c for c in df.columns if 'date' in str(c).lower()), None)
                    if date_col:
                        try:
                            start = df[date_col].min()
                            end = df[date_col].max()
                            date_range = f"{start} - {end}"
                        except: pass

                type_label = "Unknown"
                if "synt" in sheet.lower(): type_label = "Synthesis (Calculated)"
                elif "arome" in sheet.lower(): type_label = "Model AROME"
                elif "ecmwf" in sheet.lower(): type_label = "Model ECMWF"
                elif "obs" in sheet.lower() or "his" in sheet.lower(): type_label = "History Obs"

                details.append({
                    "entity": f"Sheet: {sheet}",
                    "variable": type_label,
                    "range": date_range,
                    "count": rows,
                    "status": "Ready" if rows > 0 else "Empty",
                    "action": "Process"
                })
                summary_parts.append(f"{sheet}({rows})")

            summary = f"Excel Analyzed. Sheets: {', '.join(summary_parts)}"
            return {
                "status": "success" if not errors else "warning",
                "summary": summary, 
                "details": details, 
                "errors": errors,
                "logs": self._generate_logs(summary, details, errors)
            }
        except Exception as e:
            errors = [str(e)]
            return {
                "status": "error",
                "summary": "Error parsing Excel", 
                "details": [], 
                "errors": errors,
                "logs": self._generate_logs("Error parsing Excel", [], errors)
            }

    def _analyze_hms_excel(self, content: bytes) -> Dict[str, Any]:
        """Analyzes resultats sebou.xlsx"""
        try:
            xl = pd.ExcelFile(io.BytesIO(content))
            sheet_names = xl.sheet_names
            
            details = []
            
            # Logic: 2 sheets per Dam (Hourly/Daily), 1 per Station
            dams = ["wahda", "driss", "ouljet", "alla"] # Keywords
            
            for sheet in sheet_names:
                # SKIP sheets starting with "recap" - they are daily summaries, not separate entities
                if sheet.lower().startswith("recap"):
                    continue
                
                df = parse_excel_safe(xl, sheet)
                rows = len(df) if df is not None else 0
                
                # Determine type
                category = "Station/Poste"
                if any(d in sheet.lower() for d in dams):
                    category = "Barrage"
                    if "jour" in sheet.lower() or "synt" in sheet.lower():
                        category += " (Journalier)"
                    else:
                        category += " (Horaire)"
                
                details.append({
                    "entity": sheet,
                    "variable": category,
                    "range": "N/A", # Deep analysis would be slow here
                    "count": rows,
                    "status": "Ready",
                    "action": "Import"
                })

            summary = f"Found {len(details)} sheets (Dams/Stations). Recap sheets filtered out."
            return {
                "status": "success",
                "summary": summary,
                "details": details,
                "errors": [],
                "logs": self._generate_logs(summary, details, [])
            }
        except Exception as e:
            errors = [str(e)]
            return {
                "status": "error",
                "summary": "Error parsing HMS Excel", 
                "details": [], 
                "errors": errors,
                "logs": self._generate_logs("Error parsing HMS Excel", [], errors)
            }

def parse_excel_safe(xl, sheet):
    try:
        return xl.parse(sheet)
    except:
        return None
