const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
const fs = require('fs');

async function extractImages(pdfPath) {
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const loadingTask = pdfjsLib.getDocument({ data });
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(1);
  const opList = await page.getOperatorList();
  
  let imageCount = 0;
  for (let i = 0; i < opList.fnArray.length; i++) {
    const fn = opList.fnArray[i];
    if (fn === pdfjsLib.OPS.paintImageXObject || fn === pdfjsLib.OPS.paintJpegXObject) {
      const imgIndex = opList.argsArray[i][0];
      const imgData = await page.objs.get(imgIndex);
      console.log(`Found image: ${imgIndex}, dimensions: ${imgData.width}x${imgData.height}`);
      imageCount++;
    }
  }
  console.log(`Total images found: ${imageCount}`);
}

extractImages(process.argv[2]).catch(console.error);
