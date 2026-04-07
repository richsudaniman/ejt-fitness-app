import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Camera, Loader2, Plus, AlertCircle, Scan, X, Package } from "lucide-react";
import { format } from "date-fns";

export default function FoodPhotoAnalyzer({ onFoodAnalyzed }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState(null);
  const [barcode, setBarcode] = useState('');
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [stream, setStream] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (stream && videoRef.current && isCameraOpen) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(err => {
        console.error("Error playing video:", err);
      });
    }
  }, [stream, isCameraOpen]);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const startCamera = async () => {
    try {
      setError('');
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      
      setStream(mediaStream);
      setIsCameraOpen(true);
    } catch (err) {
      console.error("Camera access error:", err);
      setError("Camera access denied. Please enable camera permissions.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraOpen(false);
  };

  const captureAndScanBarcode = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(async (blob) => {
      if (blob) {
        try {
          setAnalyzing(true);
          setError('');
          
          const { file_url } = await base44.integrations.Core.UploadFile({ file: blob });
          
          // Try to detect barcode first
          const barcodeResult = await base44.integrations.Core.InvokeLLM({
            prompt: "Detect any barcodes in this image. Extract the barcode number if found. If no barcode is visible, return false.",
            file_urls: [file_url],
            response_json_schema: {
              type: "object",
              properties: {
                barcode_detected: { type: "boolean" },
                barcode_number: { type: "string" }
              }
            }
          });

          if (barcodeResult.barcode_detected && barcodeResult.barcode_number) {
            setBarcode(barcodeResult.barcode_number);
            stopCamera();
            await handleBarcodeSearch(barcodeResult.barcode_number);
          } else {
            // No barcode, analyze as food instead
            const nutritionSchema = {
              type: "object",
              properties: {
                name: { type: "string", description: "Food name" },
                calories: { type: "number", description: "Total calories" },
                protein: { type: "number", description: "Protein in grams" },
                carbs: { type: "number", description: "Carbs in grams" },
                fats: { type: "number", description: "Fats in grams" }
              },
              required: ["name", "calories", "protein", "carbs", "fats"]
            };

            const foodResult = await base44.integrations.Core.InvokeLLM({
              prompt: "Analyze this food image. Identify the food, estimate realistic portion sizes, and provide accurate nutritional information for calories, protein, carbs, and fats.",
              file_urls: [file_url],
              response_json_schema: nutritionSchema
            });

            setResults(foodResult);
            stopCamera();
            
            const today = format(new Date(), 'yyyy-MM-dd');
            await onFoodAnalyzed({
              date: today,
              meal_name: foodResult.name,
              calories: foodResult.calories,
              protein: foodResult.protein,
              carbs: foodResult.carbs,
              fats: foodResult.fats,
              meal_type: 'Snack'
            });
          }
        } catch (error) {
          setError("Failed to analyze image. Please try again.");
        }
        setAnalyzing(false);
      }
    }, 'image/jpeg', 0.8);
  };

  const handleBarcodeSearch = async (barcodeNumber = barcode) => {
    if (!barcodeNumber.trim()) return;

    setAnalyzing(true);
    setError('');
    setResults(null);

    try {
      const nutritionSchema = {
        type: "object",
        properties: {
          name: { type: "string", description: "Product name" },
          calories: { type: "number", description: "Calories per serving" },
          protein: { type: "number", description: "Protein in grams" },
          carbs: { type: "number", description: "Carbs in grams" },
          fats: { type: "number", description: "Fats in grams" }
        },
        required: ["name", "calories", "protein", "carbs", "fats"]
      };

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Look up nutritional information for product with barcode: ${barcodeNumber}. Provide product name and nutritional values per serving.`,
        add_context_from_internet: true,
        response_json_schema: nutritionSchema
      });

      setResults(result);
      
      const today = format(new Date(), 'yyyy-MM-dd');
      await onFoodAnalyzed({
        date: today,
        meal_name: result.name,
        calories: result.calories,
        protein: result.protein,
        carbs: result.carbs,
        fats: result.fats,
        meal_type: 'Snack'
      });
    } catch (err) {
      setError(err.message || 'Barcode lookup failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAnalyzing(true);
    setError('');
    setResults(null);

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      const nutritionSchema = {
        type: "object",
        properties: {
          name: { type: "string", description: "Food name" },
          calories: { type: "number", description: "Total calories" },
          protein: { type: "number", description: "Protein in grams" },
          carbs: { type: "number", description: "Carbs in grams" },
          fats: { type: "number", description: "Fats in grams" }
        },
        required: ["name", "calories", "protein", "carbs", "fats"]
      };

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: "Analyze this food image. Identify the food, estimate realistic portion sizes, and provide accurate nutritional information for calories, protein, carbs, and fats.",
        file_urls: [file_url],
        response_json_schema: nutritionSchema
      });

      setResults(result);
      
      const today = format(new Date(), 'yyyy-MM-dd');
      await onFoodAnalyzed({
        date: today,
        meal_name: result.name,
        calories: result.calories,
        protein: result.protein,
        carbs: result.carbs,
        fats: result.fats,
        meal_type: 'Snack'
      });
    } catch (err) {
      setError(err.message || 'Analysis failed');
    } finally {
      setAnalyzing(false);
      e.target.value = '';
    }
  };

  if (isCameraOpen) {
    return (
      <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 overflow-hidden">
        <CardContent className="p-0">
          <div className="relative bg-black rounded-lg overflow-hidden" style={{ height: '400px' }}>
            <div className="absolute top-0 left-0 right-0 z-20 flex justify-between items-center p-3 bg-gradient-to-b from-black/60 to-transparent">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={stopCamera}
                className="rounded-full bg-white/20 hover:bg-white/30 text-white h-9 w-9"
              >
                <X className="w-4 h-4" />
              </Button>
              <span className="text-white text-sm font-bold">📸 Capture Food</span>
              <div className="w-9"></div>
            </div>

            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Scanner Frame */}
            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
              <div className="relative w-64 h-48">
                {/* Corner brackets */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-purple-400"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-purple-400"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-purple-400"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-purple-400"></div>
                
                {/* Scanning line animation */}
                {!analyzing && (
                  <div className="absolute inset-0 overflow-hidden">
                    <div className="w-full h-1 bg-gradient-to-r from-transparent via-purple-400 to-transparent animate-scan"></div>
                  </div>
                )}
              </div>
            </div>

            {analyzing && (
              <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-3 z-30">
                <Loader2 className="w-10 h-10 animate-spin text-purple-400" />
                <p className="text-white text-sm font-semibold">Analyzing...</p>
              </div>
            )}

            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-20 flex flex-col items-center gap-2">
              <Button
                onClick={captureAndScanBarcode}
                disabled={analyzing}
                className="bg-purple-600 hover:bg-purple-700 text-white rounded-full w-16 h-16 p-0 shadow-xl border-4 border-white"
              >
                <Camera className="w-6 h-6" />
              </Button>
              <p className="text-white text-xs font-semibold bg-black/40 px-3 py-1 rounded-full">
                Tap to capture
              </p>
            </div>

            <canvas ref={canvasRef} className="hidden" />
          </div>
        </CardContent>
        
        <style>{`
          @keyframes scan {
            0% { transform: translateY(0); }
            100% { transform: translateY(192px); }
          }
          .animate-scan {
            animation: scan 2s ease-in-out infinite;
          }
        `}</style>
      </Card>
    );
  }

  return (
    <Card className="bg-white border-0 shadow-sm rounded-3xl">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-[#0ea5e9] to-[#06b6d4] rounded-2xl flex items-center justify-center">
            <Camera className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-[#1a1a1a]">Food Tracker</h3>
            <p className="text-xs text-gray-500">Photo, camera, or barcode</p>
          </div>
        </div>

        {/* Photo Upload */}
        <div>
          <input
            id="food-photo-upload"
            type="file"
            accept="image/*"
            onChange={handlePhotoUpload}
            disabled={analyzing}
            className="hidden"
          />
          <label htmlFor="food-photo-upload" className="block">
            <Button
              type="button"
              disabled={analyzing}
              className="w-full bg-[#0ea5e9] hover:bg-[#0284c7] text-white font-semibold rounded-xl"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('food-photo-upload').click();
              }}
            >
              <Camera className="w-4 h-4 mr-2" />
              Upload Photo
            </Button>
          </label>
        </div>

        {/* Camera Button */}
        <Button
          onClick={startCamera}
          variant="outline"
          className="w-full border-gray-200 font-semibold rounded-xl hover:bg-gray-50"
          disabled={analyzing}
        >
          <Scan className="w-4 h-4 mr-2" />
          Open Camera
        </Button>

        {/* Barcode Input */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-3 bg-white text-gray-400 font-medium">or enter barcode</span>
          </div>
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="Barcode number..."
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            className="flex-1 font-mono"
            disabled={analyzing}
          />
          <Button
            onClick={() => handleBarcodeSearch()}
            disabled={!barcode.trim() || analyzing}
            className="bg-[#0ea5e9] hover:bg-[#0284c7] text-white rounded-xl"
          >
            <Package className="w-4 h-4" />
          </Button>
        </div>

        {analyzing && (
          <div className="p-4 bg-gray-50 rounded-xl flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-[#0ea5e9] animate-spin" />
            <p className="text-sm text-gray-600 font-medium">Analyzing...</p>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 rounded-xl flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-600 font-medium">{error}</p>
          </div>
        )}

        {results && (
          <div className="p-4 bg-gray-50 rounded-xl space-y-3">
            <h4 className="font-bold text-[#1a1a1a] text-base">{results.name || 'Food Item'}</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-600">Calories:</span>
                <span className="font-bold ml-1">{results.calories}</span>
              </div>
              <div>
                <span className="text-gray-600">Protein:</span>
                <span className="font-bold ml-1">{results.protein}g</span>
              </div>
              <div>
                <span className="text-gray-600">Carbs:</span>
                <span className="font-bold ml-1">{results.carbs}g</span>
              </div>
              <div>
                <span className="text-gray-600">Fats:</span>
                <span className="font-bold ml-1">{results.fats}g</span>
              </div>
            </div>
            <div className="pt-3 border-t border-gray-200">
              <p className="text-xs text-green-600 font-semibold flex items-center gap-1">
                <Plus className="w-4 h-4" />
                Added to your log!
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}