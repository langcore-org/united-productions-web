"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Upload } from "lucide-react";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { getStorageUrl } from "@/lib/utils";

interface ImageUploadProps {
  currentImageUrl?: string | null;
  onUpload: (file: File) => Promise<string>;
  aspectRatio?: number;
  cropShape?: "rect" | "round";
  placeholder?: React.ReactNode;
  buttonLabel?: string;
  className?: string;
  imageClassName?: string;
  disabled?: boolean;
}

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

function ImageCropper({
  imageSrc,
  aspectRatio,
  onCropComplete,
}: {
  imageSrc: string;
  aspectRatio: number;
  onCropComplete: (croppedBlob: Blob) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [cropArea, setCropArea] = useState<CropArea>({ x: 0, y: 0, width: 100, height: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeCorner, setResizeCorner] = useState<string | null>(null);

  // Initialize crop area when image loads
  useEffect(() => {
    if (imageLoaded && imageRef.current && containerRef.current) {
      const img = imageRef.current;
      const container = containerRef.current;

      // Calculate displayed image size (object-contain)
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      const imgAspect = img.naturalWidth / img.naturalHeight;
      const containerAspect = containerWidth / containerHeight;

      let displayWidth, displayHeight;
      if (imgAspect > containerAspect) {
        displayWidth = containerWidth;
        displayHeight = containerWidth / imgAspect;
      } else {
        displayHeight = containerHeight;
        displayWidth = containerHeight * imgAspect;
      }

      setImageSize({ width: displayWidth, height: displayHeight });

      // Initialize crop area centered, respecting aspect ratio
      const minDim = Math.min(displayWidth, displayHeight) * 0.7;
      const cropWidth = aspectRatio >= 1 ? minDim : minDim * aspectRatio;
      const cropHeight = aspectRatio >= 1 ? minDim / aspectRatio : minDim;

      setCropArea({
        x: (displayWidth - cropWidth) / 2,
        y: (displayHeight - cropHeight) / 2,
        width: cropWidth,
        height: cropHeight,
      });
    }
  }, [imageLoaded, aspectRatio]);

  const handleMouseDown = useCallback((e: React.MouseEvent, corner?: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (corner) {
      setIsResizing(true);
      setResizeCorner(corner);
    } else {
      setIsDragging(true);
    }
    setDragStart({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging && !isResizing) return;

    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;

    setCropArea(prev => {
      if (isDragging) {
        // Move the crop area
        let newX = prev.x + deltaX;
        let newY = prev.y + deltaY;

        // Constrain to image bounds
        newX = Math.max(0, Math.min(newX, imageSize.width - prev.width));
        newY = Math.max(0, Math.min(newY, imageSize.height - prev.height));

        return { ...prev, x: newX, y: newY };
      } else if (isResizing && resizeCorner) {
        // Resize the crop area
        let newWidth = prev.width;
        let newHeight = prev.height;
        let newX = prev.x;
        let newY = prev.y;

        if (resizeCorner.includes('e')) {
          newWidth = Math.max(50, prev.width + deltaX);
        }
        if (resizeCorner.includes('w')) {
          const widthChange = Math.min(deltaX, prev.width - 50);
          newWidth = prev.width - widthChange;
          newX = prev.x + widthChange;
        }
        if (resizeCorner.includes('s')) {
          newHeight = Math.max(50, prev.height + deltaY);
        }
        if (resizeCorner.includes('n')) {
          const heightChange = Math.min(deltaY, prev.height - 50);
          newHeight = prev.height - heightChange;
          newY = prev.y + heightChange;
        }

        // Maintain aspect ratio
        if (aspectRatio) {
          if (resizeCorner.includes('e') || resizeCorner.includes('w')) {
            newHeight = newWidth / aspectRatio;
          } else {
            newWidth = newHeight * aspectRatio;
          }
        }

        // Constrain to image bounds
        if (newX < 0) { newWidth += newX; newX = 0; }
        if (newY < 0) { newHeight += newY; newY = 0; }
        if (newX + newWidth > imageSize.width) newWidth = imageSize.width - newX;
        if (newY + newHeight > imageSize.height) newHeight = imageSize.height - newY;

        // Maintain aspect ratio after constraining
        if (aspectRatio) {
          const currentRatio = newWidth / newHeight;
          if (currentRatio > aspectRatio) {
            newWidth = newHeight * aspectRatio;
          } else {
            newHeight = newWidth / aspectRatio;
          }
        }

        return { x: newX, y: newY, width: newWidth, height: newHeight };
      }
      return prev;
    });

    setDragStart({ x: e.clientX, y: e.clientY });
  }, [isDragging, isResizing, dragStart, imageSize, resizeCorner, aspectRatio]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
    setResizeCorner(null);
  }, []);

  const getCroppedImage = useCallback(() => {
    if (!imageRef.current || !containerRef.current) return;

    const img = imageRef.current;
    const container = containerRef.current;

    // Calculate scale between displayed and natural image size
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const imgAspect = img.naturalWidth / img.naturalHeight;
    const containerAspect = containerWidth / containerHeight;

    let displayWidth, displayHeight, offsetX, offsetY;
    if (imgAspect > containerAspect) {
      displayWidth = containerWidth;
      displayHeight = containerWidth / imgAspect;
      offsetX = 0;
      offsetY = (containerHeight - displayHeight) / 2;
    } else {
      displayHeight = containerHeight;
      displayWidth = containerHeight * imgAspect;
      offsetX = (containerWidth - displayWidth) / 2;
      offsetY = 0;
    }

    const scaleX = img.naturalWidth / displayWidth;
    const scaleY = img.naturalHeight / displayHeight;

    // Calculate crop in natural image coordinates
    const naturalCrop = {
      x: cropArea.x * scaleX,
      y: cropArea.y * scaleY,
      width: cropArea.width * scaleX,
      height: cropArea.height * scaleY,
    };

    // Create canvas and crop
    const canvas = document.createElement("canvas");
    canvas.width = naturalCrop.width;
    canvas.height = naturalCrop.height;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    ctx.drawImage(
      img,
      naturalCrop.x,
      naturalCrop.y,
      naturalCrop.width,
      naturalCrop.height,
      0,
      0,
      naturalCrop.width,
      naturalCrop.height
    );

    canvas.toBlob((blob) => {
      if (blob) onCropComplete(blob);
    }, "image/png", 1);
  }, [cropArea, onCropComplete]);

  // Expose getCroppedImage
  useEffect(() => {
    (window as unknown as { __cropImage?: () => void }).__cropImage = getCroppedImage;
    return () => {
      delete (window as unknown as { __cropImage?: () => void }).__cropImage;
    };
  }, [getCroppedImage]);

  const imageOffset = {
    x: ((containerRef.current?.clientWidth || 0) - imageSize.width) / 2,
    y: ((containerRef.current?.clientHeight || 0) - imageSize.height) / 2,
  };

  return (
    <div
      ref={containerRef}
      className="relative h-[300px] w-full select-none overflow-hidden bg-black"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Image */}
      <img
        ref={imageRef}
        src={imageSrc}
        alt="Crop preview"
        className="h-full w-full object-contain"
        onLoad={() => setImageLoaded(true)}
        draggable={false}
      />

      {/* Crop selection box */}
      {imageLoaded && (
        <div
          className="absolute border-2 border-white cursor-move"
          style={{
            left: imageOffset.x + cropArea.x,
            top: imageOffset.y + cropArea.y,
            width: cropArea.width,
            height: cropArea.height,
            boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.5)",
          }}
          onMouseDown={(e) => handleMouseDown(e)}
        >
          {/* Corner resize handles */}
          {["nw", "ne", "sw", "se"].map((corner) => (
            <div
              key={corner}
              className="absolute h-4 w-4 bg-white border border-gray-400"
              style={{
                cursor: `${corner}-resize`,
                top: corner.includes("n") ? -8 : "auto",
                bottom: corner.includes("s") ? -8 : "auto",
                left: corner.includes("w") ? -8 : "auto",
                right: corner.includes("e") ? -8 : "auto",
              }}
              onMouseDown={(e) => handleMouseDown(e, corner)}
            />
          ))}

          {/* Edge resize handles */}
          {["n", "s", "e", "w"].map((edge) => (
            <div
              key={edge}
              className="absolute bg-white"
              style={{
                cursor: edge === "n" || edge === "s" ? "ns-resize" : "ew-resize",
                top: edge === "n" ? -4 : edge === "s" ? "auto" : "50%",
                bottom: edge === "s" ? -4 : "auto",
                left: edge === "w" ? -4 : edge === "e" ? "auto" : "50%",
                right: edge === "e" ? -4 : "auto",
                width: edge === "n" || edge === "s" ? 32 : 8,
                height: edge === "e" || edge === "w" ? 32 : 8,
                transform: edge === "n" || edge === "s" ? "translateX(-50%)" : "translateY(-50%)",
              }}
              onMouseDown={(e) => handleMouseDown(e, edge)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function ImageUpload({
  currentImageUrl,
  onUpload,
  aspectRatio = 1,
  cropShape = "rect",
  placeholder,
  buttonLabel = "画像を変更",
  className,
  imageClassName,
  disabled = false,
}: ImageUploadProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.addEventListener("load", () => {
          setImageSrc(reader.result as string);
          setIsDialogOpen(true);
          setCroppedBlob(null);
        });
        reader.readAsDataURL(file);
      }
    },
    []
  );

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleCropComplete = useCallback((blob: Blob) => {
    setCroppedBlob(blob);
  }, []);

  const handleConfirm = useCallback(async () => {
    // Trigger crop
    const cropFn = (window as unknown as { __cropImage?: () => void }).__cropImage;
    if (cropFn) cropFn();

    // Wait a bit for the blob to be set
    await new Promise(resolve => setTimeout(resolve, 100));
  }, []);

  // Upload when croppedBlob is set
  useEffect(() => {
    if (croppedBlob && isDialogOpen) {
      const upload = async () => {
        setIsUploading(true);
        try {
          const file = new File([croppedBlob], "image.png", { type: "image/png" });
          await onUpload(file);
          setIsDialogOpen(false);
          setImageSrc(null);
          setCroppedBlob(null);
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        } catch (error) {
          console.error("Error uploading image:", error);
        } finally {
          setIsUploading(false);
        }
      };
      upload();
    }
  }, [croppedBlob, isDialogOpen, onUpload]);

  const handleDialogClose = useCallback(() => {
    setIsDialogOpen(false);
    setImageSrc(null);
    setCroppedBlob(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  return (
    <>
      <div className={`flex flex-col items-center gap-4 ${className || ""}`}>
        <div
          className={`flex items-center justify-center overflow-hidden border-2 border-dashed bg-muted/50 ${
            cropShape === "round" ? "rounded-full" : "rounded-lg"
          } ${imageClassName || ""}`}
        >
          {currentImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={getStorageUrl(currentImageUrl) ?? currentImageUrl}
              alt="Current image"
              className="h-full w-full object-cover"
            />
          ) : (
            placeholder
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleUploadClick}
          disabled={disabled}
        >
          <Upload className="mr-2 h-4 w-4" />
          {buttonLabel}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-lg" showCloseButton={false}>
          <VisuallyHidden.Root>
            <DialogTitle>画像をトリミング</DialogTitle>
          </VisuallyHidden.Root>

          {imageSrc && (
            <ImageCropper
              imageSrc={imageSrc}
              aspectRatio={aspectRatio}
              onCropComplete={handleCropComplete}
            />
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleDialogClose}>
              キャンセル
            </Button>
            <Button onClick={handleConfirm} disabled={isUploading}>
              {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              確定
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
