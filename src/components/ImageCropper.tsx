import React, { useState, useRef, useEffect, useCallback } from 'react';

interface ImageCropperProps {
  onSave: (croppedImageBlob: Blob) => void;
  onCancel: () => void;
  initialImageUrl?: string;
}

export default function ImageCropper({ onSave, onCancel, initialImageUrl }: ImageCropperProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(initialImageUrl || null);
  const [scale, setScale] = useState(1.0); // Start at base scale
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [imageDisplaySize, setImageDisplaySize] = useState<{ width: number; height: number } | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const CROP_SIZE = 256; // Size of the circular crop area

  // Calculate initial display size to fit image nicely in container
  const calculateImageDisplay = useCallback((imgWidth: number, imgHeight: number, containerSize: number) => {
    // We want the image to initially display at about 1.5x the container size
    // This gives room to pan while not being too zoomed in
    const targetDisplaySize = containerSize * 1.5;
    
    // Calculate the aspect ratio
    const aspectRatio = imgWidth / imgHeight;
    
    // Determine base display dimensions maintaining aspect ratio
    let baseWidth: number;
    let baseHeight: number;
    
    if (imgWidth > imgHeight) {
      // Landscape or square
      baseWidth = targetDisplaySize;
      baseHeight = targetDisplaySize / aspectRatio;
    } else {
      // Portrait
      baseHeight = targetDisplaySize;
      baseWidth = targetDisplaySize * aspectRatio;
    }
    
    // Start at scale 1.0 (no additional scaling beyond the CSS size)
    return {
      baseWidth,
      baseHeight,
      initialScale: 1.0
    };
  }, []);

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImageSrc(event.target?.result as string);
        // Reset scale, position, and display size - will be calculated when image loads
        setScale(1.0);
        setPosition({ x: 0, y: 0 });
        setImageDisplaySize(null);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle mouse/touch drag for panning
  const handleMouseDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!imageSrc) return;
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setDragStart({ x: clientX - position.x, y: clientY - position.y });
  }, [imageSrc, position]);

  const handleMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDragging || !imageSrc) return;
    e.preventDefault();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setPosition({
      x: clientX - dragStart.x,
      y: clientY - dragStart.y,
    });
  }, [isDragging, imageSrc, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleMouseMove);
      document.addEventListener('touchend', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleMouseMove);
        document.removeEventListener('touchend', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Handle zoom with mouse wheel
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!imageSrc) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale((prev) => Math.max(0.5, Math.min(3, prev + delta)));
  }, [imageSrc]);

  // Crop and save the image
  const handleSave = async () => {
    if (!imageSrc || !imageRef.current || !canvasRef.current || !containerRef.current || !imageDisplaySize) return;

    setIsLoading(true);
    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = CROP_SIZE;
      canvas.height = CROP_SIZE;

      const img = imageRef.current;
      const imgNaturalWidth = img.naturalWidth;
      const imgNaturalHeight = img.naturalHeight;
      
      // Get container and image bounding boxes
      const containerRect = containerRef.current.getBoundingClientRect();
      const imageRect = img.getBoundingClientRect();
      
      const containerSize = containerRect.width;
      const containerCenterX = containerRect.left + containerSize / 2;
      const containerCenterY = containerRect.top + containerSize / 2;
      
      // Calculate what part of the natural image is at the crop center
      // The crop center in image display coordinates (relative to imageRect)
      const cropCenterXInDisplay = containerCenterX - imageRect.left;
      const cropCenterYInDisplay = containerCenterY - imageRect.top;
      
      // Convert from displayed coordinates to natural image coordinates
      const scaleX = imgNaturalWidth / imageRect.width;
      const scaleY = imgNaturalHeight / imageRect.height;
      
      const cropCenterXInImage = cropCenterXInDisplay * scaleX;
      const cropCenterYInImage = cropCenterYInDisplay * scaleY;
      
      // Calculate the crop radius in natural image coordinates
      const cropRadiusInImage = (containerSize / 2) * scaleX;
      
      // Calculate source rectangle (square centered on crop center)
      const sourceSize = cropRadiusInImage * 2;
      let sourceX = cropCenterXInImage - cropRadiusInImage;
      let sourceY = cropCenterYInImage - cropRadiusInImage;
      
      // Clamp to image bounds
      sourceX = Math.max(0, Math.min(imgNaturalWidth - sourceSize, sourceX));
      sourceY = Math.max(0, Math.min(imgNaturalHeight - sourceSize, sourceY));
      
      // Ensure we don't exceed image bounds
      const actualSourceSize = Math.min(sourceSize, imgNaturalWidth - sourceX, imgNaturalHeight - sourceY);

      // Create circular clipping path
      ctx.save();
      ctx.beginPath();
      ctx.arc(CROP_SIZE / 2, CROP_SIZE / 2, CROP_SIZE / 2, 0, Math.PI * 2);
      ctx.clip();

      // Draw the cropped image
      ctx.drawImage(
        img,
        sourceX,
        sourceY,
        actualSourceSize,
        actualSourceSize,
        0,
        0,
        CROP_SIZE,
        CROP_SIZE
      );

      ctx.restore();

      // Convert canvas to blob
      canvas.toBlob((blob) => {
        if (blob) {
          onSave(blob);
        }
        setIsLoading(false);
      }, 'image/jpeg', 0.95);
    } catch (error) {
      console.error('Error cropping image:', error);
      alert('Failed to crop image. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-4">
        <h2 className="text-xl font-bold mb-4">Edit Profile Picture</h2>

        {!imageSrc ? (
          <div className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              aria-label="Select profile picture image"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-3 px-4 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 touch-manipulation min-h-[44px]"
            >
              Select Image
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Image cropper area */}
            <div
              ref={containerRef}
              className="relative w-full aspect-square bg-gray-100 rounded-full overflow-hidden border-4 border-gray-300 mx-auto"
              style={{ maxWidth: CROP_SIZE, maxHeight: CROP_SIZE }}
              onWheel={handleWheel}
              onMouseDown={handleMouseDown}
              onTouchStart={handleMouseDown}
            >
              <img
                ref={imageRef}
                src={imageSrc}
                alt="Crop preview"
                className="absolute top-1/2 left-1/2"
                style={{
                  transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px)) scale(${scale})`,
                  cursor: isDragging ? 'grabbing' : 'grab',
                  userSelect: 'none',
                  width: imageDisplaySize ? `${imageDisplaySize.width}px` : 'auto',
                  height: imageDisplaySize ? `${imageDisplaySize.height}px` : 'auto',
                  maxWidth: 'none',
                }}
                draggable={false}
                onLoad={() => {
                  // Calculate initial scale and display size when image loads
                  if (imageRef.current && containerRef.current) {
                    const img = imageRef.current;
                    const container = containerRef.current;
                    const containerSize = container.offsetWidth;
                    const imgNaturalWidth = img.naturalWidth;
                    const imgNaturalHeight = img.naturalHeight;
                    
                    // Calculate display size and initial scale
                    const display = calculateImageDisplay(imgNaturalWidth, imgNaturalHeight, containerSize);
                    setImageDisplaySize({ width: display.baseWidth, height: display.baseHeight });
                    setScale(display.initialScale);
                    setPosition({ x: 0, y: 0 });
                  }
                }}
              />
            </div>

            {/* Controls */}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Zoom: {Math.round(scale * 100)}%
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.1"
                  value={scale}
                  onChange={(e) => setScale(parseFloat(e.target.value))}
                  className="w-full"
                  aria-label="Zoom level"
                />
              </div>

              <div className="text-xs text-gray-500 text-center">
                Drag the image to position it • Use zoom slider or mouse wheel
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-3 px-4 rounded-lg font-semibold text-gray-700 bg-gray-200 hover:bg-gray-300 active:bg-gray-400 touch-manipulation min-h-[44px]"
              >
                Change Image
              </button>
              <button
                onClick={onCancel}
                className="flex-1 py-3 px-4 rounded-lg font-semibold text-gray-700 bg-gray-200 hover:bg-gray-300 active:bg-gray-400 touch-manipulation min-h-[44px]"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isLoading}
                className={`flex-1 py-3 px-4 rounded-lg font-semibold text-white touch-manipulation min-h-[44px] ${
                  isLoading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
                }`}
              >
                {isLoading ? 'Saving...' : 'Save'}
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              aria-label="Select profile picture image"
            />
          </div>
        )}

        {/* Hidden canvas for cropping */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}
