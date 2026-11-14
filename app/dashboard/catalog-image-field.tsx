"use client";

import { useState } from "react";
import { ImagePlus, LoaderCircle, Trash2 } from "lucide-react";
import styles from "./catalog-image-field.module.css";

type Props = {
  bucket: "produtos" | "servicos";
  imageUrl: string | null;
  onChange: (imageUrl: string | null) => void;
  disabled?: boolean;
};

export default function CatalogImageField({ bucket, imageUrl, onChange, disabled = false }: Props) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");

  async function uploadImage(file: File | undefined) {
    if (!file) return;
    setError("");
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.set("bucket", bucket);
      formData.set("file", file);
      const response = await fetch("/api/admin/catalog-image", { method: "POST", body: formData });
      const result = await response.json() as { imageUrl?: string; message?: string };
      if (!response.ok || !result.imageUrl) throw new Error(result.message || "Não foi possível enviar a imagem.");
      onChange(result.imageUrl);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível enviar a imagem.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className={styles.field}>
      <span className={styles.label}>Imagem <small>(opcional)</small></span>
      <div className={styles.content}>
        <div
          className={styles.preview}
          role={imageUrl ? "img" : undefined}
          aria-label={imageUrl ? "Prévia da imagem selecionada" : undefined}
          style={imageUrl ? { backgroundImage: "url(" + JSON.stringify(imageUrl) + ")" } : undefined}
        >
          {!imageUrl && <ImagePlus aria-hidden="true" />}
          {isUploading && <span className={styles.uploading}><LoaderCircle aria-hidden="true" />Enviando...</span>}
        </div>
        <div className={styles.controls}>
          <label className={styles.chooseButton}>
            <ImagePlus aria-hidden="true" />
            {imageUrl ? "Trocar imagem" : "Escolher imagem"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={disabled || isUploading}
              onChange={(event) => {
                void uploadImage(event.currentTarget.files?.[0]);
                event.currentTarget.value = "";
              }}
            />
          </label>
          {imageUrl && <button type="button" className={styles.removeButton} onClick={() => { setError(""); onChange(null); }} disabled={disabled || isUploading}><Trash2 aria-hidden="true" />Remover</button>}
          <small>JPG, PNG ou WebP. Até 5 MB.</small>
        </div>
      </div>
      {error && <p className={styles.error} role="alert">{error}</p>}
    </div>
  );
}
