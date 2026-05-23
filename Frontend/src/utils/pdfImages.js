import * as pdfjsLib from 'pdfjs-dist';

/**
 * Extracts raw images from the first page of a PDF document.
 * Returns an array of Base64 Data URLs.
 * 
 * @param {import('pdfjs-dist').PDFDocumentProxy} pdf 
 * @returns {Promise<string[]>} Array of base64 image strings
 */
export async function extractImagesFromPdf(pdf) {
  const images = [];
  try {
    const page = await pdf.getPage(1);
    const opList = await page.getOperatorList();
    
    for (let i = 0; i < opList.fnArray.length; i++) {
      const fn = opList.fnArray[i];
      // OPS.paintImageXObject (85) or OPS.paintJpegXObject (82)
      if (fn === pdfjsLib.OPS.paintImageXObject || fn === pdfjsLib.OPS.paintJpegXObject) {
        const imgIndex = opList.argsArray[i][0];
        
        try {
          const imgData = await page.objs.get(imgIndex);
          if (!imgData || !imgData.width || !imgData.height) continue;
          
          const canvas = document.createElement('canvas');
          canvas.width = imgData.width;
          canvas.height = imgData.height;
          const ctx = canvas.getContext('2d');
          
          if (imgData.bitmap instanceof ImageBitmap) {
            // Modern browsers might return an ImageBitmap
            ctx.drawImage(imgData.bitmap, 0, 0);
          } else if (imgData.data) {
            // Raw pixel data
            let clampedArray;
            // pdf.js sometimes returns 3 channels (RGB) instead of 4 (RGBA)
            if (imgData.data.length === imgData.width * imgData.height * 3) {
              clampedArray = new Uint8ClampedArray(imgData.width * imgData.height * 4);
              let j = 0, k = 0;
              while (j < imgData.data.length) {
                clampedArray[k++] = imgData.data[j++]; // R
                clampedArray[k++] = imgData.data[j++]; // G
                clampedArray[k++] = imgData.data[j++]; // B
                clampedArray[k++] = 255;               // A
              }
            } else {
              clampedArray = new Uint8ClampedArray(imgData.data);
            }
            const imageDataObj = new ImageData(clampedArray, imgData.width, imgData.height);
            ctx.putImageData(imageDataObj, 0, 0);
          } else {
             continue; // Unrecognized format
          }
          
          images.push(canvas.toDataURL('image/png'));
        } catch (err) {
          console.warn('Failed to extract image object:', imgIndex, err);
        }
      }
    }
  } catch (err) {
    console.error('Error extracting images from PDF:', err);
  }
  
  return images;
}
