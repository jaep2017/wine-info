"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { wineIdentificationSchema } from "@/lib/ai/schemas";
import type { WineIdentification } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type Step = "entry" | "confirm";

const EMPTY_IDENTIFICATION: WineIdentification = {
  producer: "",
  canonicalWineName: "",
  vintage: null,
  country: "",
  region: "",
  subregion: "",
  appellation: "",
  vineyard: "",
  classification: "",
  grapes: [],
  wineType: "",
  confidence: 0,
  ambiguities: [],
  shortIdentificationExplanation: "",
};

export function LogBottleFlow() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("entry");
  const [producer, setProducer] = useState("");
  const [wine, setWine] = useState("");
  const [vintage, setVintage] = useState("");
  const [labelFile, setLabelFile] = useState<File | null>(null);
  const [identification, setIdentification] = useState<WineIdentification>(EMPTY_IDENTIFICATION);
  const [grapeText, setGrapeText] = useState("");
  const [personalNotes, setPersonalNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [usedAI, setUsedAI] = useState(true);

  async function identifyWine(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      const response = await fetch("/api/wines/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          producer,
          wine,
          vintage: vintage || null,
        }),
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          typeof payload === "object" && payload && "error" in payload
            ? String((payload as { error: string }).error)
            : "Identification failed.",
        );
      }

      const parsed = wineIdentificationSchema.parse(payload);
      setIdentification(parsed);
      setGrapeText(
        parsed.grapes
          .map((grape) =>
            grape.percentage != null ? `${grape.name} ${grape.percentage}%` : grape.name,
          )
          .join(", "),
      );
      setUsedAI(
        typeof payload === "object" && payload && "usedAI" in payload
          ? Boolean((payload as { usedAI?: boolean }).usedAI)
          : true,
      );
      setStep("confirm");
    } catch (err) {
      setIdentification({
        ...EMPTY_IDENTIFICATION,
        producer,
        canonicalWineName: wine,
        vintage: vintage ? Number.parseInt(vintage, 10) || null : null,
        ambiguities: ["Identification failed. Complete the fields manually."],
        shortIdentificationExplanation:
          "The bottle was not identified automatically. Your original entry is preserved below.",
      });
      setUsedAI(false);
      setStep("confirm");
      setError(err instanceof Error ? err.message : "Identification failed.");
    } finally {
      setPending(false);
    }
  }

  async function confirmWine(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      const grapes = grapeText
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => {
          const match = /^(.*?)(?:\s+(\d+(?:\.\d+)?)%?)?$/.exec(part);
          return {
            name: match?.[1]?.trim() || part,
            percentage: match?.[2] ? Number(match[2]) : null,
          };
        });

      let labelImagePath: string | null = null;
      if (labelFile) {
        const supabase = createBrowserSupabaseClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const extension = labelFile.name.split(".").pop() || "jpg";
          const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
          const { error: uploadError } = await supabase.storage
            .from("labels")
            .upload(path, labelFile);
          if (uploadError) {
            console.error(uploadError);
          } else {
            labelImagePath = path;
          }
        }
      }

      const response = await fetch("/api/wines/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identification: {
            ...identification,
            grapes,
          },
          personalNotes,
          labelImagePath,
          rawInput: { producer, wine, vintage: vintage || null },
        }),
      });

      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          typeof payload === "object" && payload && "error" in payload
            ? String((payload as { error: string }).error)
            : "Could not save the wine.",
        );
      }

      const wineId = (payload as { wineId: string }).wineId;
      router.push(`/wines/${wineId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the wine.");
    } finally {
      setPending(false);
    }
  }

  if (step === "entry") {
    return (
      <form onSubmit={identifyWine} className="max-w-xl space-y-6">
        <Field
          id="producer"
          label="Producer"
          value={producer}
          onChange={setProducer}
          required
        />
        <Field
          id="wine"
          label="Wine / cuvée"
          value={wine}
          onChange={setWine}
          required
        />
        <Field
          id="vintage"
          label="Vintage"
          value={vintage}
          onChange={setVintage}
          placeholder="Leave blank for NV"
        />
        <div className="space-y-2">
          <Label htmlFor="label">Label image (optional)</Label>
          <Input
            id="label"
            type="file"
            accept="image/*"
            onChange={(event) => setLabelFile(event.target.files?.[0] ?? null)}
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Identifying…" : "Identify Wine"}
        </Button>
      </form>
    );
  }

  const uncertain = identification.confidence > 0 && identification.confidence < 0.65;

  return (
    <form onSubmit={confirmWine} className="max-w-2xl space-y-6">
      <div className="border-b border-border pb-5">
        <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">
          Confirm identification
        </p>
        <p className="mt-2 text-[15px] leading-7 text-muted-foreground">
          {identification.shortIdentificationExplanation ||
            "Review the structured identification before it becomes part of your library."}
        </p>
        {!usedAI ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Automatic identification was unavailable. Your original entry was kept.
          </p>
        ) : null}
        {uncertain || identification.ambiguities.length > 0 ? (
          <div className="mt-4 text-sm leading-6 text-muted-foreground">
            <p>Nothing uncertain was saved automatically. Please review:</p>
            <ul className="mt-2 list-disc pl-5">
              {identification.ambiguities.map((item) => (
                <li key={item}>{item}</li>
              ))}
              {uncertain ? (
                <li>Model confidence is {Math.round(identification.confidence * 100)}%.</li>
              ) : null}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          id="c-producer"
          label="Producer"
          value={identification.producer}
          onChange={(value) => setIdentification((current) => ({ ...current, producer: value }))}
          required
        />
        <Field
          id="c-wine"
          label="Wine"
          value={identification.canonicalWineName}
          onChange={(value) =>
            setIdentification((current) => ({ ...current, canonicalWineName: value }))
          }
          required
        />
        <Field
          id="c-vintage"
          label="Vintage"
          value={identification.vintage ? String(identification.vintage) : ""}
          onChange={(value) =>
            setIdentification((current) => ({
              ...current,
              vintage: value ? Number.parseInt(value, 10) || null : null,
            }))
          }
        />
        <Field
          id="c-country"
          label="Country"
          value={identification.country}
          onChange={(value) => setIdentification((current) => ({ ...current, country: value }))}
        />
        <Field
          id="c-region"
          label="Region"
          value={identification.region}
          onChange={(value) => setIdentification((current) => ({ ...current, region: value }))}
        />
        <Field
          id="c-subregion"
          label="Subregion"
          value={identification.subregion}
          onChange={(value) => setIdentification((current) => ({ ...current, subregion: value }))}
        />
        <Field
          id="c-appellation"
          label="Appellation"
          value={identification.appellation}
          onChange={(value) =>
            setIdentification((current) => ({ ...current, appellation: value }))
          }
        />
        <Field
          id="c-vineyard"
          label="Vineyard"
          value={identification.vineyard}
          onChange={(value) => setIdentification((current) => ({ ...current, vineyard: value }))}
        />
        <Field
          id="c-classification"
          label="Classification"
          value={identification.classification}
          onChange={(value) =>
            setIdentification((current) => ({ ...current, classification: value }))
          }
        />
        <Field
          id="c-type"
          label="Wine type"
          value={identification.wineType}
          onChange={(value) => setIdentification((current) => ({ ...current, wineType: value }))}
        />
      </div>

      <Field
        id="c-grapes"
        label="Grapes"
        value={grapeText}
        onChange={setGrapeText}
        placeholder="Chardonnay, or Pinot Noir 80%, Pinot Meunier 20%"
      />

      <div className="space-y-2">
        <Label htmlFor="notes">Personal notes (optional)</Label>
        <Textarea
          id="notes"
          value={personalNotes}
          onChange={(event) => setPersonalNotes(event.target.value)}
          placeholder="Service context, questions, or observations worth keeping."
        />
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving and updating notes…" : "Confirm & Add Wine"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => {
            setStep("entry");
            setError(null);
          }}
        >
          Back
        </Button>
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  required,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
