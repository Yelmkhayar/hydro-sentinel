import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export type DisplayMode = 'solo' | 'mix';
export type ChartMode = 'overlay' | 'continuous';

export interface VariableOption {
  code: string;
  label: string;
  sources: Array<{
    code: string;
    label: string;
    color: string;
  }>;
}

export interface VariableGroup {
  label: string;
  icon?: string;
  variables: VariableOption[];
}

// Define variable groups with AROME and ECMWF forecast sources
const VARIABLE_GROUPS: VariableGroup[] = [
  {
    label: 'Précipitations',
    variables: [
      {
        code: 'precip_mm',
        label: 'Précipitations',
        sources: [
          { code: 'OBS', label: 'Observées', color: '#3b82f6' },
          { code: 'AROME', label: 'Prévision AROME', color: '#8b5cf6' },
          { code: 'ECMWF', label: 'Prévision ECMWF', color: '#ec4899' },
        ],
      },
    ],
  },
  {
    label: 'Débit',
    variables: [
      {
        code: 'flow_m3s',
        label: 'Débit',
        sources: [
          { code: 'OBS', label: 'Observé', color: '#10b981' },
          { code: 'SIMULE', label: 'Simulé', color: '#f59e0b' },
        ],
      },
    ],
  },
  {
    label: 'Volumes & Apports',
    variables: [
      {
        code: 'volume_hm3',
        label: 'Volume',
        sources: [
          { code: 'OBS', label: 'Observé', color: '#f97316' },
        ],
      },
      {
        code: 'inflow_m3s',
        label: 'Apports',
        sources: [
          { code: 'OBS', label: 'Observés', color: '#84cc16' },
        ],
      },
    ],
  },
];

export interface VariableSelection {
  variableCode: string;
  sourceCodes: string[];
}

export interface VariableSelectorProps {
  onSelectionChange: (selections: VariableSelection[], mode: DisplayMode, chartMode: ChartMode) => void;
  initialMode?: DisplayMode;
  initialChartMode?: ChartMode;
}

export function AdvancedVariableSelector({
  onSelectionChange,
  initialMode = 'solo',
  initialChartMode = 'overlay',
}: VariableSelectorProps) {
  const [displayMode, setDisplayMode] = useState<DisplayMode>(initialMode);
  const [chartMode, setChartMode] = useState<ChartMode>(initialChartMode);
  const [selectedVariable, setSelectedVariable] = useState<string>('precip_mm');
  const [selectedSources, setSelectedSources] = useState<Record<string, string[]>>({
    precip_mm: ['OBS'],
  });

  const handleDisplayModeChange = (mode: DisplayMode) => {
    setDisplayMode(mode);
    notifyChange(mode, chartMode);
  };

  const handleChartModeChange = (mode: ChartMode) => {
    setChartMode(mode);
    notifyChange(displayMode, mode);
  };

  const handleVariableChange = (variableCode: string) => {
    setSelectedVariable(variableCode);
    if (!selectedSources[variableCode]) {
      // Initialize with first source
      const variable = VARIABLE_GROUPS.flatMap(g => g.variables).find(v => v.code === variableCode);
      if (variable && variable.sources.length > 0) {
        setSelectedSources({
          ...selectedSources,
          [variableCode]: [variable.sources[0].code],
        });
      }
    }
    notifyChange(displayMode, chartMode);
  };

  const handleSourceToggle = (variableCode: string, sourceCode: string) => {
    const currentSources = selectedSources[variableCode] || [];
    const newSources = currentSources.includes(sourceCode)
      ? currentSources.filter(s => s !== sourceCode)
      : [...currentSources, sourceCode];

    setSelectedSources({
      ...selectedSources,
      [variableCode]: newSources,
    });
    notifyChange(displayMode, chartMode);
  };

  const notifyChange = (mode: DisplayMode, cMode: ChartMode) => {
    const selections: VariableSelection[] = [];

    if (mode === 'solo') {
      // Solo mode: only selected variable
      const sources = selectedSources[selectedVariable] || [];
      if (sources.length > 0) {
        selections.push({
          variableCode: selectedVariable,
          sourceCodes: sources,
        });
      }
    } else {
      // Mix mode: all variables with selected sources
      Object.entries(selectedSources).forEach(([variableCode, sources]) => {
        if (sources.length > 0) {
          selections.push({
            variableCode,
            sourceCodes: sources,
          });
        }
      });
    }

    onSelectionChange(selections, mode, cMode);
  };

  const getActiveVariable = () => {
    return VARIABLE_GROUPS.flatMap(g => g.variables).find(v => v.code === selectedVariable);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Variables à afficher</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Display Mode Toggle */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Mode d'affichage</Label>
          <div className="flex gap-2">
            <button
              onClick={() => handleDisplayModeChange('solo')}
              className={`flex-1 px-3 py-2 text-sm rounded-md transition-colors ${
                displayMode === 'solo'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              Mode Solo
            </button>
            <button
              onClick={() => handleDisplayModeChange('mix')}
              className={`flex-1 px-3 py-2 text-sm rounded-md transition-colors ${
                displayMode === 'mix'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              Mode Mix
            </button>
          </div>
        </div>

        <Separator />

        {/* Variable Selection */}
        <div className="space-y-3">
          {VARIABLE_GROUPS.map((group) => (
            <div key={group.label} className="space-y-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {group.label}
              </div>
              <div className="space-y-2">
                {group.variables.map((variable) => (
                  <div key={variable.code} className="space-y-2">
                    <div className="flex items-center gap-2">
                      {displayMode === 'solo' ? (
                        <RadioGroup
                          value={selectedVariable}
                          onValueChange={handleVariableChange}
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value={variable.code} id={variable.code} />
                            <Label htmlFor={variable.code} className="text-sm cursor-pointer">
                              {variable.label}
                            </Label>
                          </div>
                        </RadioGroup>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`mix-${variable.code}`}
                            checked={(selectedSources[variable.code] || []).length > 0}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedSources({
                                  ...selectedSources,
                                  [variable.code]: [variable.sources[0].code],
                                });
                              } else {
                                const newSources = { ...selectedSources };
                                delete newSources[variable.code];
                                setSelectedSources(newSources);
                              }
                              notifyChange(displayMode, chartMode);
                            }}
                          />
                          <Label htmlFor={`mix-${variable.code}`} className="text-sm cursor-pointer">
                            {variable.label}
                          </Label>
                        </div>
                      )}
                    </div>

                    {/* Source Selection */}
                    {((displayMode === 'solo' && selectedVariable === variable.code) ||
                      (displayMode === 'mix' && (selectedSources[variable.code] || []).length > 0)) && (
                      <div className="ml-6 space-y-1">
                        {variable.sources.map((source) => (
                          <div key={source.code} className="flex items-center space-x-2">
                            <Checkbox
                              id={`${variable.code}-${source.code}`}
                              checked={(selectedSources[variable.code] || []).includes(source.code)}
                              onCheckedChange={() => handleSourceToggle(variable.code, source.code)}
                            />
                            <Label
                              htmlFor={`${variable.code}-${source.code}`}
                              className="text-xs cursor-pointer flex items-center gap-1"
                            >
                              <span
                                className="w-3 h-3 rounded-sm"
                                style={{ backgroundColor: source.color }}
                              />
                              {source.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <Separator />

        {/* Chart Mode Toggle */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Mode de graphique</Label>
          <div className="flex gap-2">
            <button
              onClick={() => handleChartModeChange('overlay')}
              className={`flex-1 px-3 py-2 text-sm rounded-md transition-colors ${
                chartMode === 'overlay'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              Superposition
            </button>
            <button
              onClick={() => handleChartModeChange('continuous')}
              className={`flex-1 px-3 py-2 text-sm rounded-md transition-colors ${
                chartMode === 'continuous'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              Continuité
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            {chartMode === 'overlay'
              ? 'Affiche toutes les séries sur le même graphique'
              : 'Affiche chaque série dans un graphique séparé'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
