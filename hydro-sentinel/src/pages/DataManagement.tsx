import { useState, useCallback, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapContainer, TileLayer, GeoJSON, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Loader2, Plus, Trash2, Edit, Upload, Map as MapIcon, Database, AlertTriangle, LineChart as LineChartIcon, ArrowUpDown, Search, Check, Download, X } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import L from 'leaflet';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Fix Leaflet icon issue
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
// @ts-ignore
L.Marker.prototype.options.icon = DefaultIcon;

// Helper: trigger file download from blob
function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export default function DataManagement() {
  const [activeTab, setActiveTab] = useState("stations");
  const queryClient = useQueryClient();

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Gestion des Données</h2>
        <p className="text-muted-foreground">Administrer les stations, bassins et fichiers géographiques.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="stations" className="gap-2"><Database className="h-4 w-4"/> Stations</TabsTrigger>
          <TabsTrigger value="bassins" className="gap-2"><Database className="h-4 w-4"/> Bassins</TabsTrigger>
          <TabsTrigger value="shp" className="gap-2"><MapIcon className="h-4 w-4"/> Fichiers SHP</TabsTrigger>
          <TabsTrigger value="timeseries" className="gap-2"><LineChartIcon className="h-4 w-4"/> Séries Temporelles</TabsTrigger>
        </TabsList>

        <TabsContent value="stations">
          <EntityCrud type="stations" />
        </TabsContent>

        <TabsContent value="bassins">
          <EntityCrud type="bassins" />
        </TabsContent>

        <TabsContent value="shp">
          <ShpManager />
        </TabsContent>

        <TabsContent value="timeseries">
          <TimeSeriesManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── EntityCrud ──────────────────────────────────────────────────────────────

function EntityCrud({ type }: { type: string }) {
    const queryClient = useQueryClient();
    const { data: entities, isLoading } = useQuery({
        queryKey: ['entities', type],
        queryFn: () => api.getEntities(type),
    });

    const [searchTerm, setSearchTerm] = useState("");
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
    const [dialogMode, setDialogMode] = useState<'create' | 'edit' | null>(null);
    const [selectedEntity, setSelectedEntity] = useState<any>(null);
    const [deleteTarget, setDeleteTarget] = useState<any>(null);

    // Filter
    const filteredEntities = entities?.filter((e: any) => {
        const term = searchTerm.toLowerCase();
        const name = (e.name || e.label || "").toString().toLowerCase();
        const code = (e.code || e.alias || "").toString().toLowerCase();
        const id = (e.id || "").toString().toLowerCase();
        return name.includes(term) || code.includes(term) || id.includes(term);
    });

    // Sort
    const sortedEntities = [...(filteredEntities || [])].sort((a: any, b: any) => {
        if (!sortConfig) return 0;
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];
        if (sortConfig.key === 'name') { aValue = a.name || a.label; bValue = b.name || b.label; }
        else if (sortConfig.key === 'code') { aValue = a.code || a.alias; bValue = b.code || b.alias; }
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    const requestSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
        setSortConfig({ key, direction });
    };

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: (entity: any) => {
            const id = entity.station_id || entity.basin_id;
            return api.deleteEntity(type, id);
        },
        onSuccess: () => {
            toast.success("Entité supprimée avec succès");
            queryClient.invalidateQueries({ queryKey: ['entities', type] });
            setDeleteTarget(null);
        },
        onError: (err: any) => {
            toast.error("Erreur lors de la suppression: " + (err.response?.data?.detail || err.message));
            setDeleteTarget(null);
        }
    });

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>{type === 'stations' ? 'Stations' : 'Bassins / Zones'}</CardTitle>
                            <CardDescription>Gérer les référentiels {type}</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Rechercher..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-8 w-[200px]"
                                />
                            </div>
                            {type === 'stations' && (
                                <Button size="sm" onClick={() => { setSelectedEntity(null); setDialogMode('create'); }}>
                                    <Plus className="mr-2 h-4 w-4"/> Nouveau
                                </Button>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead onClick={() => requestSort('code')} className="cursor-pointer hover:bg-muted/50 transition-colors">
                                            Code {sortConfig?.key === 'code' && <ArrowUpDown className="inline h-3 w-3 ml-1"/>}
                                        </TableHead>
                                        <TableHead onClick={() => requestSort('name')} className="cursor-pointer hover:bg-muted/50 transition-colors">
                                            Nom {sortConfig?.key === 'name' && <ArrowUpDown className="inline h-3 w-3 ml-1"/>}
                                        </TableHead>
                                        {type === 'stations' && (
                                            <TableHead onClick={() => requestSort('station_type')} className="cursor-pointer hover:bg-muted/50 transition-colors">
                                                Type {sortConfig?.key === 'station_type' && <ArrowUpDown className="inline h-3 w-3 ml-1"/>}
                                            </TableHead>
                                        )}
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sortedEntities.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                                                Aucun résultat trouvé.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        sortedEntities.map((entity: any) => (
                                            <TableRow key={entity.station_id || entity.basin_id || entity.code}>
                                                <TableCell className="font-medium">{entity.code || entity.alias}</TableCell>
                                                <TableCell>{entity.name || entity.label}</TableCell>
                                                {type === 'stations' && (
                                                    <TableCell>
                                                        <Badge variant="outline">{entity.station_type || 'N/A'}</Badge>
                                                    </TableCell>
                                                )}
                                                <TableCell className="text-right space-x-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => { setSelectedEntity(entity); setDialogMode('edit'); }}
                                                        title="Modifier"
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-red-500 hover:text-red-600"
                                                        onClick={() => setDeleteTarget(entity)}
                                                        title="Supprimer"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Create / Edit Dialog */}
            <EntityFormDialog
                type={type}
                mode={dialogMode}
                entity={selectedEntity}
                onClose={() => setDialogMode(null)}
                onSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: ['entities', type] });
                    setDialogMode(null);
                }}
            />

            {/* Delete Confirmation */}
            <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                        <AlertDialogDescription>
                            Voulez-vous vraiment supprimer <strong>{deleteTarget?.name || deleteTarget?.code}</strong> ?
                            {type === 'stations' && (
                                <span className="block mt-2 text-red-600 font-medium">
                                    ⚠️ Toutes les séries temporelles associées seront également supprimées.
                                </span>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700"
                            onClick={() => deleteMutation.mutate(deleteTarget)}
                            disabled={deleteMutation.isPending}
                        >
                            {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Supprimer
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

// ─── EntityFormDialog ─────────────────────────────────────────────────────────

function EntityFormDialog({
    type,
    mode,
    entity,
    onClose,
    onSuccess
}: {
    type: string;
    mode: 'create' | 'edit' | null;
    entity: any;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [form, setForm] = useState({
        name: "",
        code: "",
        station_type: "Station hydrologique",
        lat: "",
        lon: ""
    });

    // Sync form when entity changes
    const initForm = useCallback(() => {
        if (entity && mode === 'edit') {
            setForm({
                name: entity.name || entity.label || "",
                code: entity.code || entity.alias || "",
                station_type: entity.station_type || "Station hydrologique",
                lat: entity.lat || entity.y || entity.latitude || "",
                lon: entity.lon || entity.x || entity.longitude || ""
            });
        } else {
            setForm({ name: "", code: "", station_type: "Station hydrologique", lat: "", lon: "" });
        }
    }, [entity, mode]);

    // Reset form when dialog opens or dependencies change
    useEffect(() => { initForm(); }, [initForm]);

    const createMutation = useMutation({
        mutationFn: (data: any) => api.createEntity(type, data),
        onSuccess: () => { toast.success("Entité créée avec succès"); onSuccess(); },
        onError: (err: any) => toast.error("Erreur: " + (err.response?.data?.detail || err.message))
    });

    const updateMutation = useMutation({
        mutationFn: (data: any) => {
            const id = entity?.station_id || entity?.basin_id;
            return api.updateEntity(type, id, data);
        },
        onSuccess: () => { toast.success("Entité mise à jour avec succès"); onSuccess(); },
        onError: (err: any) => toast.error("Erreur: " + (err.response?.data?.detail || err.message))
    });

    const handleSubmit = () => {
        const data: any = {
            name: form.name,
            code: form.code,
        };
        if (type === 'stations') data.station_type = form.station_type;
        if (form.lat && form.lon) {
            data.lat = parseFloat(form.lat);
            data.lon = parseFloat(form.lon);
        }

        if (mode === 'create') createMutation.mutate(data);
        else updateMutation.mutate(data);
    };

    const isPending = createMutation.isPending || updateMutation.isPending;
    const isOpen = mode !== null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>
                        {mode === 'create'
                            ? `Nouvelle ${type === 'stations' ? 'Station' : 'Bassin'}`
                            : `Modifier: ${entity?.name || entity?.code}`}
                    </DialogTitle>
                    <DialogDescription>
                        {mode === 'create' ? 'Remplissez les informations de la nouvelle entité.' : 'Modifiez les informations de l\'entité.'}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="entity-code">Code *</Label>
                            <Input
                                id="entity-code"
                                value={form.code}
                                onChange={(e) => setForm(f => ({ ...f, code: e.target.value }))}
                                placeholder="Ex: S001"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="entity-name">Nom *</Label>
                            <Input
                                id="entity-name"
                                value={form.name}
                                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                                placeholder="Ex: Station Amont"
                            />
                        </div>
                    </div>

                    {type === 'stations' && (
                        <div className="space-y-2">
                            <Label>Type de station</Label>
                            <Select value={form.station_type} onValueChange={(v) => setForm(f => ({ ...f, station_type: v }))}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Station hydrologique">Station hydrologique</SelectItem>
                                    <SelectItem value="Poste Pluviométrique">Poste Pluviométrique</SelectItem>
                                    <SelectItem value="Barrage">Barrage</SelectItem>
                                    <SelectItem value="point resultats">Point résultats</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="entity-lat">Latitude</Label>
                            <Input
                                id="entity-lat"
                                type="number"
                                step="0.000001"
                                value={form.lat}
                                onChange={(e) => setForm(f => ({ ...f, lat: e.target.value }))}
                                placeholder="Ex: 34.0151"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="entity-lon">Longitude</Label>
                            <Input
                                id="entity-lon"
                                type="number"
                                step="0.000001"
                                value={form.lon}
                                onChange={(e) => setForm(f => ({ ...f, lon: e.target.value }))}
                                placeholder="Ex: -5.0078"
                                required
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Annuler</Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={!form.name || !form.code || (type === "stations" && (form.lat === "" || form.lon === "")) || isPending}
                    >
                        {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        {mode === 'create' ? 'Créer' : 'Enregistrer'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─── ShpManager ───────────────────────────────────────────────────────────────

function ShpManager() {
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<any>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isCommitting, setIsCommitting] = useState(false);
    const [features, setFeatures] = useState<any[]>([]);
    const [columns, setColumns] = useState<string[]>([]);
    
    const [entityType, setEntityType] = useState<string>("stations");
    const [replaceMode, setReplaceMode] = useState<boolean>(false);
    const [columnMapping, setColumnMapping] = useState<any>({});

    const handleAnalyze = async () => {
        if (!file) return;
        setIsUploading(true);
        const formData = new FormData();
        formData.append("file", file);
        formData.append("dry_run", "true");
        
        try {
            const res = await api.uploadShp(formData);
            setPreview(res.data.preview);
            setColumns(res.data.columns || []);
            features.length = 0;
            if (res.data.preview?.features) {
                setFeatures(res.data.preview.features);
            }
            setColumnMapping({}); // Reset mapping
            toast.success(res.data.message + (res.data.debug_version ? " (" + res.data.debug_version + ")" : ""));

        } catch (e: any) {
            toast.error("Erreur analyse SHP: " + (e.response?.data?.detail || e.message));
        } finally {
            setIsUploading(false);
        }
    };

    const handleCommit = async () => {
        if (!file) return;
        if (replaceMode && !confirm("ATTENTION: Vous allez supprimer TOUTES les données existantes pour ce type, et potentiellement les séries temporelles associées. Continuer ?")) {
            return;
        }

        setIsCommitting(true);
        const formData = new FormData();
        formData.append("file", file);
        formData.append("dry_run", "false");
        formData.append("entity_type", entityType);
        formData.append("replace_mode", String(replaceMode));
        formData.append("column_mapping", JSON.stringify(columnMapping));

        try {
            const res = await api.uploadShp(formData);
            toast.success(res.data.message);
            setPreview(null);
            setFeatures([]);
            setFile(null);
        } catch (e: any) {
            toast.error("Erreur import SHP: " + (e.response?.data?.detail || e.message));
        } finally {
            setIsCommitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Importer un Shapefile</CardTitle>
                    <CardDescription>Mise à jour des référentiels géographiques (Stations / Bassins)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Type d'entité</Label>
                                <RadioGroup value={entityType} onValueChange={setEntityType} className="flex gap-4">
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="stations" id="r-stations" />
                                        <Label htmlFor="r-stations">Stations</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="bassins" id="r-bassins" />
                                        <Label htmlFor="r-bassins">Bassins</Label>
                                    </div>
                                </RadioGroup>
                            </div>

                            <div className="grid w-full max-w-sm items-center gap-1.5">
                                <Label htmlFor="shp">Fichier ZIP (.shp, .shx, .dbf, .prj)</Label>
                                <Input id="shp" type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                            </div>
                            
                            <Button onClick={handleAnalyze} disabled={!file || isUploading} variant="secondary" className="w-full">
                                {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                                1. Analyser le fichier
                            </Button>
                        </div>

                        {preview && (
                            <div className="space-y-4 border p-4 rounded-md bg-muted/20">
                                <h4 className="font-semibold flex items-center gap-2">
                                    <Check className="h-4 w-4 text-green-500"/> Prêt à importer
                                </h4>
                                <div className="text-sm space-y-1 text-muted-foreground">
                                    <p>• {features.length} éléments détectés</p>
                                    <p>• Attributs clés: {columns.slice(0, 3).join(', ')}...</p>
                                </div>

                                <div className="space-y-3 pt-2 border-t">
                                    <h5 className="text-sm font-semibold">Correspondance des Colonnes</h5>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <Label className="text-xs">Colonne Code</Label>
                                            <Select onValueChange={(v) => setColumnMapping({...columnMapping, code: v === "AUTO" ? undefined : v})}>
                                                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Automatique" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="AUTO">Automatique</SelectItem>
                                                    {columns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    <div className="space-y-1">
                                            <Label className="text-xs">Colonne Nom</Label>
                                            <Select onValueChange={(v) => setColumnMapping({...columnMapping, name: v === "AUTO" ? undefined : v})}>
                                                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Automatique" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="AUTO">Automatique</SelectItem>
                                                    {columns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        {entityType === 'stations' && (
                                            <>
                                                <div className="space-y-1">
                                                    <Label className="text-xs">Colonne Bassin</Label>
                                                    <Select onValueChange={(v) => setColumnMapping({...columnMapping, basin: v === "AUTO" ? undefined : v})}>
                                                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Automatique" /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="AUTO">Automatique</SelectItem>
                                                            {columns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-xs">Colonne Type</Label>
                                                    <Select 
                                                        disabled={!!columnMapping.force_type}
                                                        onValueChange={(v) => setColumnMapping({...columnMapping, type: v === "AUTO" ? undefined : v})}
                                                    >
                                                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Automatique" /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="AUTO">Automatique</SelectItem>
                                                            {columns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-xs">Forcer un Type</Label>
                                                    <Select onValueChange={(v) => setColumnMapping({...columnMapping, force_type: v === "NONE" ? undefined : v})}>
                                                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Aucun (Détection)" /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="NONE">Aucun (Détection)</SelectItem>
                                                            <SelectItem value="Poste Pluviométrique">Poste Pluviométrique</SelectItem>
                                                            <SelectItem value="Barrage">Barrage</SelectItem>
                                                            <SelectItem value="Station hydrologique">Station hydrologique</SelectItem>
                                                            <SelectItem value="point resultats">point resultats</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="space-y-2 pt-2 border-t">
                                    <div className="flex items-center space-x-2">
                                        <Checkbox 
                                            id="replace-mode" 
                                            checked={replaceMode} 
                                            onCheckedChange={(c) => setReplaceMode(!!c)}
                                        />
                                        <Label htmlFor="replace-mode" className="text-red-600 font-medium">
                                            Remplacer tout (Supprime l'existant !)
                                        </Label>
                                    </div>
                                    <p className="text-xs text-muted-foreground ml-6">
                                        Si coché : Vide la table avant import. <br/>
                                        Si décoché : Met à jour les codes existants et ajoute les nouveaux.
                                    </p>
                                </div>

                                <Button onClick={handleCommit} disabled={isCommitting} className="w-full gap-2">
                                    {isCommitting ? <Loader2 className="h-4 w-4 animate-spin"/> : <Upload className="h-4 w-4"/>}
                                    2. Confirmer l'import en Base
                                </Button>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card className="h-[400px] flex flex-col">
                <CardHeader>
                    <CardTitle>Aperçu Carte</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 p-0 relative">
                    <MapContainer center={[34, -5]} zoom={6} style={{ height: '100%', width: '100%' }}>
                        <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        />
                        {preview && <GeoJSON data={preview} />}
                    </MapContainer>
                    {!preview && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/5 pointer-events-none z-[400]">
                            <p className="text-muted-foreground bg-white/80 p-2 rounded">Aucun aperçu disponible</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {features.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Attributs des Entités</CardTitle>
                        <CardDescription>{features.length} entités avec {columns.length} attributs</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border max-h-[400px] overflow-auto">
                            <Table>
                                <TableHeader className="sticky top-0 bg-background">
                                    <TableRow>
                                        <TableHead className="w-12">#</TableHead>
                                        {columns.slice(0, 6).map((col) => (
                                            <TableHead key={col}>{col}</TableHead>
                                        ))}
                                        {columns.length > 6 && <TableHead>...</TableHead>}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {features.map((feature, idx) => (
                                        <TableRow key={idx}>
                                            <TableCell className="font-mono text-xs text-muted-foreground">{idx + 1}</TableCell>
                                            {columns.slice(0, 6).map((col) => (
                                                <TableCell key={col} className="max-w-[200px] truncate">
                                                    {feature.properties?.[col] !== undefined 
                                                        ? String(feature.properties[col]) 
                                                        : '-'}
                                                </TableCell>
                                            ))}
                                            {columns.length > 6 && (
                                                <TableCell className="text-muted-foreground text-xs">
                                                    +{columns.length - 6} colonnes
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

// ─── TimeSeriesManager ────────────────────────────────────────────────────────

function TimeSeriesManager() {
    const queryClient = useQueryClient();
    const [entityType, setEntityType] = useState<"stations" | "bassins">("stations");
    const [selectedVariable, setSelectedVariable] = useState<string>("precip_mm");
    const [selectedStation, setSelectedStation] = useState<string | null>(null);
    
    // Fetch Basins
    const { data: basins } = useQuery({
        queryKey: ['basins'],
        queryFn: () => api.getBasins().then(res => res.data),
    });
    const { data: variables } = useQuery({
        queryKey: ['variables'],
        queryFn: () => api.getVariables().then(res => res.data),
    });

    const { data: stationsData, isLoading: isLoadingStations } = useQuery({
        queryKey: ['ts-stations', selectedVariable, entityType],
        queryFn: async () => {
            if (entityType === "bassins") {
                // Mock endpoint behavior for basins for now, return all basins
                const res = await api.getBasins();
                return {
                    variable_code: selectedVariable,
                    stations: res.data.map((b: any) => ({
                        ...b,
                        station_id: b.basin_id || b.id, // Ensure we map ID correctly
                        station_type: "Bassin",
                        data_count: 0 // We don't have this info easily for basins yet without new endpoint
                    }))
                };
            }
            return api.getTimeSeriesStations(selectedVariable);
        },
        enabled: !!selectedVariable,
    });

    const { data: tsData, isLoading: isLoadingData } = useQuery({
        queryKey: ['ts-data', selectedVariable, selectedStation, entityType],
        queryFn: () => {
            if (entityType === "bassins") {
                // Needs a new endpoint to fetch basin ts data, omitting for now to prevent crash
                return Promise.resolve({ data_count: 0, data: [] });
            }
            return api.getTimeSeriesData(selectedVariable, selectedStation!);
        },
        enabled: !!selectedVariable && !!selectedStation && entityType === "stations",
    });

    // Fetch sources
    const { data: sources } = useQuery({
        queryKey: ['ts-sources'],
        queryFn: () => api.getSources(),
    });

    // Fetch ALL stations/basins for import dropdown
    const { data: allStationsData } = useQuery({
        queryKey: ['ts-stations-all', selectedVariable, entityType],
        queryFn: async () => {
             if (entityType === "bassins") {
                const res = await api.getBasins();
                return {
                    variable_code: selectedVariable,
                    stations: res.data.map((b: any) => ({
                        ...b,
                        station_id: b.basin_id || b.id,
                        station_type: "Bassin"
                    }))
                };
            }
            return api.getTimeSeriesStations(selectedVariable, true);
        },
        enabled: !!selectedVariable,
    });

    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
    const [importOpen, setImportOpen] = useState(false);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [replaceExisting, setReplaceExisting] = useState(false);
    const [importMode, setImportMode] = useState<string>("simple");
    const [selectedSource, setSelectedSource] = useState<string>("OBS");
    const [deleteSeriesOpen, setDeleteSeriesOpen] = useState(false);
    const [deletePointTarget, setDeletePointTarget] = useState<any>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisReport, setAnalysisReport] = useState<any>(null);

    const allowedSourcesForVariable = useMemo(() => {
        const sourceList = Array.isArray(sources) ? sources : (sources?.data || []);
        if (!sourceList.length) return [];
        
        const isPrecip = ['precip', 'pluie', 'snow'].some(k => (selectedVariable || '').toLowerCase().includes(k));
        if (isPrecip) {
            return sourceList.filter((s: any) => ['OBS', 'AROME', 'ECMWF'].includes(s.code));
        } else if (['flow_m3s', 'inflow_m3s', 'volume_hm3', 'cote_m', 'volume_k'].includes(selectedVariable || '')) {
            return sourceList.filter((s: any) => ['OBS', 'SIM'].includes(s.code));
        }
        return [];
    }, [sources, selectedVariable]);

    useEffect(() => {
        if (['lacher_m3s', 'lachers'].includes(selectedVariable)) {
            setSelectedSource('ABHS_RES');
        } else if (allowedSourcesForVariable.length > 0) {
            if (!allowedSourcesForVariable.find((s: any) => s.code === selectedSource)) {
                setSelectedSource(allowedSourcesForVariable[0].code);
            }
        }
    }, [selectedVariable, allowedSourcesForVariable, selectedSource]);

    // Delete single point mutation
    const deletePointMutation = useMutation({
        mutationFn: (point: any) => api.deleteTimeSeriesPoint(selectedVariable, selectedStation!, point.timestamp),
        onSuccess: () => {
            toast.success("Point supprimé");
            queryClient.invalidateQueries({ queryKey: ['ts-data', selectedVariable, selectedStation] });
            queryClient.invalidateQueries({ queryKey: ['ts-stations', selectedVariable] });
            setDeletePointTarget(null);
        },
        onError: (err: any) => {
            toast.error("Erreur: " + (err.response?.data?.detail || err.message));
            setDeletePointTarget(null);
        }
    });

    // Delete entire series mutation
    const deleteSeriesMutation = useMutation({
        mutationFn: () => api.deleteTimeSeriesAll(selectedVariable, selectedStation!),
        onSuccess: () => {
            toast.success("Série temporelle supprimée");
            queryClient.invalidateQueries({ queryKey: ['ts-data', selectedVariable, selectedStation] });
            queryClient.invalidateQueries({ queryKey: ['ts-stations', selectedVariable] });
            setSelectedStation(null);
            setDeleteSeriesOpen(false);
        },
        onError: (err: any) => {
            toast.error("Erreur: " + (err.response?.data?.detail || err.message));
            setDeleteSeriesOpen(false);
        }
    });

    const handleAnalyze = async () => {
        if (!importFile) return;
        setIsAnalyzing(true);
        setAnalysisReport(null);
        
        const formData = new FormData();
        formData.append('file', importFile);
        formData.append('entity_type', entityType);
        
        try {
            const res = await api.analyzeTimeSeries(formData);
            setAnalysisReport(res.data);
            if (res.data.status === 'success') {
                toast.success(`Analyse terminée: ${res.data.stations_found} stations trouvées`);
            } else {
                toast.error("Erreur d'analyse: " + res.data.message);
            }
        } catch (error: any) {
             toast.error("Erreur lors de l'analyse: " + (error.response?.data?.detail || error.message));
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleImport = async () => {
        if (!importFile) return;
        if (importMode === 'simple' && (!selectedStation || !selectedVariable)) {
            toast.error("Station et Variable requises pour le mode simple");
            return;
        }
        if (importMode === 'multi_variable' && !selectedStation) {
            toast.error("Station requise pour le mode multi-variables");
            return;
        }
        if (importMode === 'multi_station' && !selectedVariable) {
            toast.error("Variable requise pour le mode multi-stations");
            return;
        }
        
        const formData = new FormData();
        if (selectedStation) formData.append('station_id', selectedStation);
        if (selectedVariable) formData.append('variable_code', selectedVariable);
        formData.append('file', importFile);
        formData.append('import_mode', importMode);
        formData.append('replace_existing', String(replaceExisting));
        formData.append('source_code', selectedSource);
        formData.append('entity_type', entityType);

        try {
            await api.uploadTimeSeries(formData);
            toast.success("Import réussi !");
            setImportOpen(false);
            setImportFile(null);
            queryClient.invalidateQueries({ queryKey: ['ts-data', selectedVariable, selectedStation] });
            queryClient.invalidateQueries({ queryKey: ['ts-stations', selectedVariable] });
        } catch (error: any) {
            toast.error("Erreur lors de l'import: " + (error.response?.data?.detail || error.message));
        }
    };

    // Smart template download handlers
    const handleDownloadTemplate = async (mode: string) => {
        try {
            let res: any;
            let filename: string;
            
            if (mode === 'simple') {
                if (!selectedStation || !selectedVariable) {
                    toast.warning("Sélectionnez une station et une variable pour générer un template pré-rempli");
                }
                res = await api.downloadTemplateSimple(selectedStation || undefined, selectedVariable || undefined);
                filename = `template_simple_${selectedStation || 'station'}_${selectedVariable || 'variable'}.xlsx`;
            } else if (mode === 'multi_variable') {
                if (!selectedStation) {
                    toast.warning("Sélectionnez une station pour générer un template pré-rempli");
                }
                res = await api.downloadTemplateMultiVariable(selectedStation || undefined);
                filename = `template_multi_variable.xlsx`;
            } else {
                if (!selectedVariable) {
                    toast.warning("Sélectionnez une variable pour générer un template pré-rempli");
                }
                res = await api.downloadTemplateMultiStation(selectedVariable || undefined);
                filename = `template_multi_station_${selectedVariable || 'variable'}.xlsx`;
            }
            
            // Extract filename from Content-Disposition header if available
            const contentDisposition = res.headers?.['content-disposition'];
            if (contentDisposition) {
                const match = contentDisposition.match(/filename=([^;]+)/);
                if (match) filename = match[1].trim();
            }
            
            downloadBlob(res.data, filename);
            toast.success("Template téléchargé !");
        } catch (err: any) {
            toast.error("Erreur lors du téléchargement: " + (err.response?.data?.detail || err.message));
        }
    };

    const sortedTsData = [...(tsData?.data || [])].sort((a: any, b: any) => {
        if (!sortConfig) return 0;
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    const chartData = tsData?.data?.map((d: any) => ({
        date: new Date(d.timestamp).toLocaleDateString('fr-FR'),
        value: d.value,
        timestamp: d.timestamp
    })).reverse() || [];

    const filteredVariables = variables?.filter((v: any) => {
        if (entityType === "bassins") {
            const code = v?.code || '';
            return ['precip_mm', 'pluie', 'precip'].some(k => code.toLowerCase().includes(k));
        }
        return true;
    });

    const selectedStationInfo = stationsData?.stations?.find((s: any) => s.station_id === selectedStation);

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Gestion des Séries Temporelles</CardTitle>
                    <CardDescription>Visualiser et gérer les données de séries temporelles par variable et station</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-4 mb-4 border-b pb-4">
                        <Button 
                            variant={entityType === "stations" ? "default" : "outline"}
                            size="sm"
                            onClick={() => {
                                setEntityType("stations");
                                setSelectedStation(null);
                            }}
                        >
                            Stations
                        </Button>
                        <Button 
                            variant={entityType === "bassins" ? "default" : "outline"}
                            size="sm"
                            onClick={() => {
                                setEntityType("bassins");
                                setSelectedStation(null);
                                // Force selectedVariable to precip_mm if switching to bassins,
                                // since only precip is allowed for bassins currently.
                                if (!['precip_mm', 'pluie'].includes(selectedVariable)) {
                                    setSelectedVariable('precip_mm');
                                }
                            }}
                        >
                            Bassins
                        </Button>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="variable">Variable</Label>
                            <select 
                                id="variable"
                                className="w-full px-3 py-2 border rounded-md bg-background"
                                value={selectedVariable}
                                onChange={(e) => {
                                    setSelectedVariable(e.target.value);
                                    setSelectedStation(null);
                                }}
                            >
                                {filteredVariables?.map((v: any) => (
                                    <option key={v.code} value={v.code}>{v.label} ({v.unit})</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="station">{entityType === "stations" ? "Station" : "Bassin"}</Label>
                            <select 
                                id="station"
                                className="w-full px-3 py-2 border rounded-md bg-background"
                                value={selectedStation || ""}
                                onChange={(e) => setSelectedStation(e.target.value || null)}
                                disabled={isLoadingStations || !stationsData?.stations?.length}
                            >
                                <option value="">{entityType === "stations" ? "Sélectionner une station" : "Sélectionner un bassin"}</option>
                                {stationsData?.stations?.map((s: any) => (
                                    <option key={s?.station_id || Math.random().toString()} value={s?.station_id}>
                                        {s?.name || 'Inconnu'} ({s?.data_count ?? 0} mesures)
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Import & Templates section */}
                    <div className="flex flex-col space-y-3 pt-4 border-t">
                        <div className="flex justify-between items-center flex-wrap gap-2">
                            <Label className="text-sm font-medium">Import de Données</Label>
                            <div className="flex gap-2 flex-wrap">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 gap-1"
                                    onClick={() => handleDownloadTemplate('simple')}
                                    title={selectedStation && selectedVariable ? `Template pré-rempli pour ${selectedVariable}` : "Sélectionnez station + variable pour pré-remplir"}
                                >
                                    <Download className="h-3 w-3" /> Modèle Simple
                                    {selectedStation && selectedVariable && <Check className="h-3 w-3 text-green-500 ml-1" />}
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 gap-1"
                                    onClick={() => handleDownloadTemplate('multi_variable')}
                                    title={selectedStation ? `Template multi-var pour la station sélectionnée` : "Sélectionnez une station pour pré-remplir"}
                                >
                                    <Download className="h-3 w-3" /> Modèle Multi-Var
                                    {selectedStation && <Check className="h-3 w-3 text-green-500 ml-1" />}
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 gap-1"
                                    onClick={() => handleDownloadTemplate('multi_station')}
                                    title={selectedVariable ? `Template multi-stations pour ${selectedVariable}` : "Sélectionnez une variable pour pré-remplir"}
                                >
                                    <Download className="h-3 w-3" /> Modèle Multi-Stations
                                    {selectedVariable && <Check className="h-3 w-3 text-green-500 ml-1" />}
                                </Button>
                                <Button size="sm" onClick={() => setImportOpen(true)} className="h-8 gap-1">
                                    <Upload className="h-3 w-3" /> Importer Données
                                </Button>
                            </div>
                        </div>
                        
                        {/* Context hint */}
                        {(selectedStation || selectedVariable) && (
                            <div className="text-xs text-muted-foreground bg-muted/30 rounded px-3 py-2 flex items-center gap-2">
                                <Check className="h-3 w-3 text-green-500 flex-shrink-0" />
                                Les templates seront pré-remplis avec :
                                {selectedVariable && <Badge variant="secondary" className="text-xs">{selectedVariable}</Badge>}
                                {selectedStationInfo && <Badge variant="secondary" className="text-xs">{selectedStationInfo.name}</Badge>}
                            </div>
                        )}
                    </div>

                    {stationsData?.stations?.length === 0 && (
                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-yellow-600" />
                            <p className="text-sm text-yellow-800">Aucune station avec des données pour cette variable</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {selectedStation && (
                <>
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Visualisation</CardTitle>
                                    <CardDescription>{tsData?.data_count || 0} points de données</CardDescription>
                                </div>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    className="gap-2"
                                    onClick={() => setDeleteSeriesOpen(true)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                    Supprimer la série
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {isLoadingData ? (
                                <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
                            ) : chartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={300}>
                                    <LineChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="date" angle={-45} textAnchor="end" height={80} />
                                        <YAxis />
                                        <Tooltip />
                                        <Legend />
                                        <Line 
                                            type="monotone" 
                                            dataKey="value" 
                                            stroke="#2563eb" 
                                            name={selectedVariable}
                                            dot={false}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : (
                                <p className="text-center text-muted-foreground p-8">Aucune donnée disponible</p>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Tableau des Données</CardTitle>
                            <CardDescription>Dernières mesures enregistrées</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border max-h-[400px] overflow-auto">
                                <Table>
                                    <TableHeader className="sticky top-0 bg-background">
                                        <TableRow>
                                            <TableHead 
                                                className="cursor-pointer hover:bg-muted/50"
                                                onClick={() => {
                                                    const direction = sortConfig?.key === 'timestamp' && sortConfig.direction === 'asc' ? 'desc' : 'asc';
                                                    setSortConfig({ key: 'timestamp', direction });
                                                }}
                                            >
                                                Date/Heure <ArrowUpDown className="inline h-3 w-3 ml-1" />
                                            </TableHead>
                                            <TableHead 
                                                className="cursor-pointer hover:bg-muted/50"
                                                onClick={() => {
                                                    const direction = sortConfig?.key === 'value' && sortConfig.direction === 'asc' ? 'desc' : 'asc';
                                                    setSortConfig({ key: 'value', direction });
                                                }}
                                            >
                                                Valeur <ArrowUpDown className="inline h-3 w-3 ml-1" />
                                            </TableHead>
                                            <TableHead 
                                                className="cursor-pointer hover:bg-muted/50"
                                                onClick={() => {
                                                    const direction = sortConfig?.key === 'quality_flag' && sortConfig.direction === 'asc' ? 'desc' : 'asc';
                                                    setSortConfig({ key: 'quality_flag', direction });
                                                }}
                                            >
                                                Qualité <ArrowUpDown className="inline h-3 w-3 ml-1" />
                                            </TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {sortedTsData?.map((d: any) => (
                                            <TableRow key={d.timestamp}>
                                                <TableCell className="font-mono text-sm">
                                                    {new Date(d.timestamp).toLocaleString('fr-FR')}
                                                </TableCell>
                                                <TableCell className="font-medium">
                                                    {d.value?.toFixed(2)} {d.unit}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={d.quality_flag === 'good' ? 'default' : 'secondary'}>
                                                        {d.quality_flag || 'N/A'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="text-red-500 hover:text-red-600"
                                                        onClick={() => setDeletePointTarget(d)}
                                                        title="Supprimer ce point"
                                                    >
                                                        <Trash2 className="h-4 w-4"/>
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}

            {/* Import Dialog */}
            <Dialog open={importOpen} onOpenChange={setImportOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Importer des données</DialogTitle>
                        <DialogDescription>Formats supportés: CSV, Excel (.xlsx)</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4 overflow-y-auto max-h-[70vh] pr-1">
                        <div className="space-y-2">
                            <Label>Mode d'import</Label>
                            <RadioGroup value={importMode} onValueChange={setImportMode} className="flex flex-col space-y-1">
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="simple" id="mode-simple" />
                                    <Label htmlFor="mode-simple">Simple (Une Station, Une Variable)</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="multi_variable" id="mode-multivar" />
                                    <Label htmlFor="mode-multivar">Multi-Variables (Une Station, Colonnes=Variables)</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="multi_station" id="mode-multistation" />
                                    <Label htmlFor="mode-multistation">Multi-Stations (Une Variable, Colonnes=Stations)</Label>
                                </div>
                            </RadioGroup>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="import-file">Fichier</Label>
                            <Input 
                                id="import-file" 
                                type="file" 
                                accept=".csv,.xlsx,.xls"
                                onChange={(e) => {
                                    setImportFile(e.target.files?.[0] || null);
                                    setAnalysisReport(null);
                                }} 
                            />
                        </div>

                        {allowedSourcesForVariable.length > 0 && (
                            <div className="space-y-2">
                                <Label>Source de données</Label>
                                <select 
                                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                                    value={selectedSource || allowedSourcesForVariable[0]?.code}
                                    onChange={(e) => setSelectedSource(e.target.value)}
                                >
                                    {allowedSourcesForVariable.map((src: any) => (
                                        <option key={src.code} value={src.code}>{src.label}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        
                        {importMode !== 'multi_station' && (
                            <div className="space-y-2">
                                <Label>Cible ({entityType === "stations" ? "Station" : "Bassin"})</Label>
                                <select 
                                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                                    value={selectedStation || ""}
                                    onChange={(e) => setSelectedStation(e.target.value || null)}
                                >
                                    <option value="">Sélectionner {entityType === "stations" ? "une station" : "un bassin"}</option>
                                    {allStationsData?.stations
                                        ?.filter((s: any) => {
                                            const isBarrageSpecific = ['lacher_m3s', 'volume_k', 'cote_m', 'lachers', 'volume'].includes(selectedVariable || '');
                                            return isBarrageSpecific ? s?.station_type === 'Barrage' : true;
                                        })
                                        ?.map((s: any) => (
                                        <option key={s?.station_id || Math.random().toString()} value={s?.station_id}>{s?.name || 'Inconnu'}</option>
                                    ))}
                                </select> 
                            </div>
                        )}
                        
                        {importMode !== 'multi_variable' && (
                            <div className="space-y-2">
                                <Label>Variable concernée</Label>
                                <select 
                                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                                    value={selectedVariable}
                                    onChange={(e) => setSelectedVariable(e.target.value)}
                                >
                                    {filteredVariables?.map((v: any) => (
                                        <option key={v.code} value={v.code}>{v.label} ({v.unit})</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="flex items-center space-x-2">
                            <Checkbox 
                                id="replace" 
                                checked={replaceExisting} 
                                onCheckedChange={(c) => setReplaceExisting(!!c)} 
                            />
                            <Label htmlFor="replace">Remplacer les données existantes pour cette période</Label>
                        </div>

                        {analysisReport && (
                            <div className="bg-muted/30 p-4 rounded-md text-sm space-y-4 border mt-2 max-h-[35vh] flex flex-col">
                                <div className="space-y-2 flex-shrink-0">
                                    <h4 className="font-semibold flex items-center justify-between">
                                        Résumé de l'analyse
                                        <Badge variant="outline" className="bg-background">{analysisReport.rows_count} lignes détectées</Badge>
                                    </h4>
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div className="bg-background p-2.5 rounded border shadow-sm">
                                            <div className="text-muted-foreground text-xs mb-1">Période</div>
                                            <div className="font-medium truncate" title={`${analysisReport.start_date} - ${analysisReport.end_date}`}>
                                                {analysisReport.start_date ? new Date(analysisReport.start_date).toLocaleDateString() : '-'} 
                                                {' '}-{' '}
                                                {analysisReport.end_date ? new Date(analysisReport.end_date).toLocaleDateString() : '-'}
                                            </div>
                                        </div>
                                        <div className="bg-background p-2.5 rounded border shadow-sm">
                                            <div className="text-muted-foreground text-xs mb-1">Stations Détectées</div>
                                            <div className="font-medium text-green-600 flex items-center gap-1.5">
                                                <Check className="h-4 w-4" /> {analysisReport.stations_found} found
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {analysisReport.unknown_columns?.length > 0 && (
                                        <div className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded border border-amber-100 flex items-start gap-2">
                                            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                                            <div className="overflow-hidden">
                                                <strong>Colonnes ignorées ({analysisReport.unknown_columns.length}):</strong>
                                                <div className="truncate mt-0.5 text-amber-800/80" title={analysisReport.unknown_columns.join(', ')}>
                                                    {analysisReport.unknown_columns.join(', ')}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {analysisReport.preview && analysisReport.preview.length > 0 && (
                                    <div className="space-y-2 flex-1 min-h-0 flex flex-col">
                                        <h4 className="font-semibold text-xs uppercase text-muted-foreground flex-shrink-0">Aperçu du fichier (5 premières lignes)</h4>
                                        <div className="rounded border overflow-auto bg-background flex-1 shadow-sm">
                                            <table className="w-full text-xs relative">
                                                <thead className="bg-muted sticky top-0 z-10 border-b">
                                                    <tr>
                                                        {analysisReport.columns?.map((col: string, i: number) => (
                                                            <th key={i} className="p-2 text-left font-medium whitespace-nowrap bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/80">
                                                                {col}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y">
                                                    {analysisReport.preview.map((row: any, i: number) => (
                                                        <tr key={i} className="hover:bg-muted/50 odd:bg-background even:bg-muted/20">
                                                            {analysisReport.columns?.map((col: string, j: number) => (
                                                                <td key={j} className="p-2 border-r last:border-0 whitespace-nowrap">
                                                                    {row[col]}
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setImportOpen(false)}>Annuler</Button>
                        <Button 
                            variant="secondary" 
                            onClick={handleAnalyze} 
                            disabled={!importFile || isAnalyzing}
                        >
                            {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
                            Analyser
                        </Button>
                        <Button onClick={handleImport} disabled={!importFile || isAnalyzing}>Importer</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete single point confirmation */}
            <AlertDialog open={!!deletePointTarget} onOpenChange={(open) => !open && setDeletePointTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer ce point de données ?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Point du {deletePointTarget ? new Date(deletePointTarget.timestamp).toLocaleString('fr-FR') : ''} — valeur: {deletePointTarget?.value?.toFixed(2)} {deletePointTarget?.unit}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700"
                            onClick={() => deletePointMutation.mutate(deletePointTarget)}
                            disabled={deletePointMutation.isPending}
                        >
                            {deletePointMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Supprimer
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Delete entire series confirmation */}
            <AlertDialog open={deleteSeriesOpen} onOpenChange={setDeleteSeriesOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer toute la série temporelle ?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Vous allez supprimer <strong>toutes les {tsData?.data_count || 0} mesures</strong> de la variable <strong>{selectedVariable}</strong> pour la station <strong>{selectedStationInfo?.name}</strong>.
                            <span className="block mt-2 text-red-600 font-medium">⚠️ Cette action est irréversible.</span>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700"
                            onClick={() => deleteSeriesMutation.mutate()}
                            disabled={deleteSeriesMutation.isPending}
                        >
                            {deleteSeriesMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Supprimer tout
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
