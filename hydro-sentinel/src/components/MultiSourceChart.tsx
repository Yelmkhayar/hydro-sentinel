import ReactEChartsCore from "echarts-for-react/lib/core";
import * as echarts from "echarts/core";
import { LineChart, BarChart } from "echarts/charts";
import {
  GridComponent, TooltipComponent, LegendComponent,
  DataZoomComponent, MarkLineComponent, ToolboxComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { TimeseriesPoint } from "@/types";

echarts.use([
  LineChart, BarChart, GridComponent, TooltipComponent,
  LegendComponent, DataZoomComponent, MarkLineComponent,
  ToolboxComponent, CanvasRenderer,
]);

const SOURCE_COLORS: Record<string, string> = {
  OBS: "#1d4ed8",
  AROME: "#dc2626",
  ECMWF: "#059669",
  HEC_HMS: "#7c3aed",
  ABHS_RES: "#d97706",
};

interface Props {
  /** keyed by source label/code */
  series: Record<string, TimeseriesPoint[]>;
  variable?: string;
  unit?: string;
  chartType?: "line" | "bar";
  height?: string;
  thresholdLines?: { value: number; label: string; color: string }[];
  showDataZoom?: boolean;
}

export function MultiSourceChart({
  series,
  variable = "",
  unit = "",
  chartType = "line",
  height = "360px",
  thresholdLines,
  showDataZoom = true,
}: Props) {
  const seriesEntries = Object.entries(series);

  const option: echarts.EChartsCoreOption = {
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "cross" },
    },
    toolbox: {
      right: 16,
      feature: {
        saveAsImage: { title: "Export image", pixelRatio: 2 },
        dataZoom: { title: { zoom: "Zoom", back: "Retour" } },
      },
    },
    legend: {
      bottom: 0,
      textStyle: { fontSize: 11 },
    },
    grid: { left: 50, right: 30, top: 40, bottom: showDataZoom ? 80 : 40 },
    xAxis: {
      type: "time",
      axisLabel: { fontSize: 10 },
    },
    yAxis: {
      type: "value",
      name: unit ? `${variable} (${unit})` : variable,
      nameTextStyle: { fontSize: 11 },
      axisLabel: { fontSize: 10 },
    },
    ...(showDataZoom
      ? {
          dataZoom: [
            { type: "slider", bottom: 30, height: 20 },
            { type: "inside" },
          ],
        }
      : {}),
    series: seriesEntries.map(([srcCode, points]) => ({
      name: srcCode,
      type: chartType,
      smooth: chartType === "line",
      symbol: "none",
      lineStyle: {
        width: srcCode === "OBS" ? 2.5 : 2,
        type: srcCode === "OBS" ? "solid" as const : "dashed" as const,
      },
      itemStyle: { color: SOURCE_COLORS[srcCode] || undefined },
      data: points.map((p) => [p.date, p.value]),
      ...(thresholdLines && srcCode === seriesEntries[0][0]
        ? {
            markLine: {
              silent: true,
              data: thresholdLines.map((t) => ({
                yAxis: t.value,
                label: { formatter: t.label, fontSize: 10 },
                lineStyle: { color: t.color, type: "dashed" as const },
              })),
            },
          }
        : {}),
    })),
  };

  return (
    <ReactEChartsCore
      echarts={echarts}
      option={option}
      style={{ height, width: "100%" }}
      notMerge
      lazyUpdate
    />
  );
}
