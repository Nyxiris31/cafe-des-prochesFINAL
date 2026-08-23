import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiDelete, apiPatch, apiPost } from "@/lib/api";
import type { Drink } from "@/lib/types";

/** Downscales an uploaded picture before storing it with the drink record. */
async function fileToDataUrl(file: File, max = 900): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unavailable");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.85);
}

interface Props {
  open: boolean;
  drink: Drink | null;
  onClose: () => void;
}

export default function DrinkEditor({ open, drink, onClose }: Props) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("chaudes");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [composition, setComposition] = useState("");
  const [allergens, setAllergens] = useState("");
  const [image, setImage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(drink?.name ?? "");
    setCategory(drink?.category ?? "chaudes");
    setTagline(drink?.tagline ?? "");
    setDescription(drink?.description ?? "");
    setComposition((drink?.composition ?? []).join(", "));
    setAllergens(drink?.allergens ?? "");
    setImage(drink?.image ?? "");
  }, [open, drink]);

  const payload = () => ({
    name: name.trim(),
    category,
    tagline: tagline.trim(),
    description: description.trim(),
    composition: composition
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean),
    allergens: allergens.trim(),
    image: image.trim(),
  });

  const save = useMutation({
    mutationFn: () =>
      drink
        ? apiPatch<Drink>(`/drinks/${drink.id}`, payload())
        : apiPost<Drink>("/drinks", payload()),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["drinks"] });
      toast.success(drink ? `${saved.name} mis à jour.` : `${saved.name} ajouté à la carte.`);
      onClose();
    },
    onError: () => toast.error("Enregistrement impossible. Vérifie les champs."),
  });

  const remove = useMutation({
    mutationFn: () => apiDelete<void>(`/drinks/${drink?.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drinks"] });
      toast.success("Boisson retirée de la carte.");
      onClose();
    },
    onError: () => toast.error("Suppression impossible."),
  });

  async function onPick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      setImage(await fileToDataUrl(file));
    } catch {
      toast.error("Image illisible.");
    } finally {
      setBusy(false);
    }
  }

  const canSave = name.trim() && description.trim() && image.trim();

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="overflow-y-auto"
        style={{ width: "min(94vw, 46rem)", maxWidth: "min(94vw, 46rem)", maxHeight: "90vh" }}
        data-testid="drink-editor-dialog"
      >
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl">
            {drink ? `Modifier ${drink.name}` : "Ajouter une boisson"}
          </DialogTitle>
          <DialogDescription>
            Nom, image, description et catégorie sont repris partout : accueil, borne et commandes.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 sm:grid-cols-[180px_1fr]">
          <div>
            <Label className="mb-1.5 block">Image</Label>
            <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-border bg-[#f7f3ee]">
              {image ? (
                <img
                  src={image}
                  alt="Aperçu"
                  className="h-full w-full object-cover"
                  data-testid="drink-editor-image-preview"
                />
              ) : (
                <span className="flex h-full items-center justify-center text-xs text-muted-foreground">
                  Aucune image
                </span>
              )}
            </div>
            <label
              className="mt-2 inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-secondary text-sm font-semibold transition-colors duration-200 hover:bg-[#e3d8c8]"
              data-testid="drink-editor-upload-label"
            >
              <ImagePlus className="h-4 w-4" /> {busy ? "Chargement…" : "Choisir un fichier"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onPick(e.target.files?.[0])}
                data-testid="drink-editor-image-input"
              />
            </label>
            <Input
              className="mt-2"
              value={image.startsWith("data:") ? "" : image}
              onChange={(e) => setImage(e.target.value)}
              placeholder="…ou coller un lien d'image"
              data-testid="drink-editor-image-url-input"
            />
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <Label htmlFor="drink-name" className="mb-1.5 block">
                Nom
              </Label>
              <Input
                id="drink-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex. Thé vert menthe"
                data-testid="drink-editor-name-input"
              />
            </div>

            <div>
              <Label className="mb-1.5 block">Catégorie</Label>
              <div className="flex gap-2">
                {[
                  { id: "chaudes", label: "Boisson chaude" },
                  { id: "fraiches", label: "Boisson fraîche" },
                ].map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategory(c.id)}
                    data-testid={`drink-editor-category-${c.id}-btn`}
                    className={`h-11 flex-1 rounded-full border text-sm font-semibold transition-colors duration-200 ${
                      category === c.id
                        ? "border-transparent bg-[#2a1810] text-[#faf6f0]"
                        : "border-[#e0d4c5] bg-white hover:bg-[#f3ece0]"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="drink-tagline" className="mb-1.5 block">
                Accroche (courte, sous le nom)
              </Label>
              <Input
                id="drink-tagline"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="Ex. Fraîcheur mentholée"
                data-testid="drink-editor-tagline-input"
              />
            </div>

            <div>
              <Label htmlFor="drink-description" className="mb-1.5 block">
                Description
              </Label>
              <Textarea
                id="drink-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ce que la boisson contient et ce qu'on ressent en la buvant."
                rows={3}
                data-testid="drink-editor-description-input"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="drink-composition" className="mb-1.5 block">
                  Composition (séparée par des virgules)
                </Label>
                <Input
                  id="drink-composition"
                  value={composition}
                  onChange={(e) => setComposition(e.target.value)}
                  placeholder="Thé vert, menthe fraîche"
                  data-testid="drink-editor-composition-input"
                />
              </div>
              <div>
                <Label htmlFor="drink-allergens" className="mb-1.5 block">
                  Allergènes
                </Label>
                <Input
                  id="drink-allergens"
                  value={allergens}
                  onChange={(e) => setAllergens(e.target.value)}
                  placeholder="Aucun"
                  data-testid="drink-editor-allergens-input"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-2 gap-2 sm:justify-between">
          {drink ? (
            <Button
              variant="ghost"
              className="text-destructive"
              onClick={() => remove.mutate()}
              disabled={remove.isPending}
              data-testid="drink-editor-delete-btn"
            >
              <Trash2 className="mr-2 h-4 w-4" /> Supprimer
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} data-testid="drink-editor-cancel-btn">
              <X className="mr-2 h-4 w-4" /> Annuler
            </Button>
            <Button
              onClick={() => save.mutate()}
              disabled={!canSave || save.isPending || busy}
              data-testid="drink-editor-save-btn"
            >
              {save.isPending ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
