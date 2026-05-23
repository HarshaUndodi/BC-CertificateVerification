import * as pdfjsLib from 'pdfjs-dist';

/**
 * Extracts raw images from the first page of a PDF document.
 * Returns an array of Base64 Data URLs.
 * 
 * Uses a canvas-based fallback approach: render the entire PDF page,
 * then also attempt operator-list extraction for individual images.
 * 
 * @param {import('pdfjs-dist').PDFDocumentProxy} pdf 
 * @returns {Promise<string[]>} Array of base64 image strings
 */
export async function extractImagesFromPdf(pdf) {
  const images = [];
  
  try {
    const page = await pdf.getPage(1);
    
    // ── Method 1: Operator List extraction (individual images) ──
    try {
      const opList = await page.getOperatorList();
      
      for (let i = 0; i < opList.fnArray.length; i++) {
        const fn = opList.fnArray[i];
        if (fn === pdfjsLib.OPS.paintImageXObject || fn === pdfjsLib.OPS.paintJpegXObject) {
          const imgIndex = opList.argsArray[i][0];
          
          try {
            // pdfjs-dist v3 uses callback-based objs.get()
            const imgData = await new Promise((resolve, reject) => {
              const timeout = setTimeout(() => reject(new Error('Timeout')), 5000);
              try {
                page.objs.get(imgIndex, (data) => {
                  clearTimeout(timeout);
                  resolve(data);
                });
              } catch (e) {
                clearTimeout(timeout);
                reject(e);
              }
            });
            
            if (!imgData) continue;
            
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            if (imgData.bitmap instanceof ImageBitmap) {
              canvas.width = imgData.bitmap.width;
              canvas.height = imgData.bitmap.height;
              ctx.drawImage(imgData.bitmap, 0, 0);
              images.push(canvas.toDataURL('image/png'));
            } else if (imgData.width && imgData.height && imgData.data) {
              canvas.width = imgData.width;
              canvas.height = imgData.height;
              
              let clampedArray;
              const expectedRGBA = imgData.width * imgData.height * 4;
              const expectedRGB = imgData.width * imgData.height * 3;
              
              if (imgData.data.length === expectedRGB) {
                // 3-channel (RGB) → convert to RGBA
                clampedArray = new Uint8ClampedArray(expectedRGBA);
                let j = 0, k = 0;
                while (j < imgData.data.length) {
                  clampedArray[k++] = imgData.data[j++];
                  clampedArray[k++] = imgData.data[j++];
                  clampedArray[k++] = imgData.data[j++];
                  clampedArray[k++] = 255;
                }
              } else if (imgData.data.length >= expectedRGBA) {
                clampedArray = new Uint8ClampedArray(imgData.data.buffer, imgData.data.byteOffset, expectedRGBA);
              } else {
                continue; // Can't figure out the format
              }
              
              const imageDataObj = new ImageData(clampedArray, imgData.width, imgData.height);
              ctx.putImageData(imageDataObj, 0, 0);
              images.push(canvas.toDataURL('image/png'));
            }
          } catch (err) {
            console.warn('Failed to extract image object:', imgIndex, err.message);
          }
        }
      }
    } catch (err) {
      console.warn('Operator list extraction failed:', err);
    }
    
    // ── Method 2: Full-page render as fallback ──
    // If no individual images were extracted, render the whole page.
    // This always works regardless of PDF structure.
    if (images.length === 0) {
      console.log('No individual images found, falling back to full-page render');
      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      
      await page.render({ canvasContext: ctx, viewport }).promise;
      images.push(canvas.toDataURL('image/png'));
    }
  } catch (err) {
    console.error('Error extracting images from PDF:', err);
  }
  
  return images;
}
