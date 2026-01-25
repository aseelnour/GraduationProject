const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Convert image to base64 for OpenAI Vision API
 * @param {string} filePath - Path to the file
 * @returns {Promise<string>} - Base64 encoded image
 */
async function convertImageToBase64(filePath) {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const base64Image = fileBuffer.toString('base64');
    const ext = path.extname(filePath).toLowerCase();
    
    // Determine mime type
    let mimeType = 'image/jpeg';
    if (ext === '.png') mimeType = 'image/png';
    else if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
    
    return `data:${mimeType};base64,${base64Image}`;
  } catch (error) {
    console.error('Error converting image to base64:', error);
    throw new Error('Failed to process image file');
  }
}

/**
 * Validate a document using OpenAI Vision API
 * @param {Object} file - The uploaded file object from multer
 * @param {string} expectedType - Expected document type description
 * @returns {Promise<Object>} - Validation result
 */
async function validateDocument(file, expectedType) {
  try {
    // Check if file exists
    if (!fs.existsSync(file.path)) {
      return {
        isValid: false,
        message: 'File not found',
        confidence: 0
      };
    }

    // Only process image files with OpenAI Vision
    const imageExtensions = ['.jpg', '.jpeg', '.png'];
    const fileExt = path.extname(file.originalname).toLowerCase();
    
    if (!imageExtensions.includes(fileExt)) {
      // For PDF and DOCX files, we'll skip AI validation and return valid
      // (These require different processing that can be added later)
      console.log(`Skipping AI validation for non-image file: ${file.originalname}`);
      return {
        isValid: true,
        message: 'Document accepted (non-image file)',
        confidence: 1,
        analysis: 'Non-image file accepted without AI validation'
      };
    }

    // Convert image to base64
    const base64Image = await convertImageToBase64(file.path);

    // Create prompt for OpenAI (in Arabic)
    const prompt = `أنت خبير في التحقق من الوثائق. قم بتحليل هذه الصورة وحدد ما إذا كانت وثيقة صالحة من نوع "${expectedType}".

إرشادات مهمة:
- تحقق من أن الوثيقة تبدو رسمية أو شرعية
- تحقق من أن نوع الوثيقة يطابق ما هو متوقع
- ابحث عن علامات الأصالة (أختام رسمية، توقيعات، ترويسات، إلخ)
- ضع في اعتبارك أن الوثائق قد تكون باللغة العربية أو الإنجليزية
- يجب أن تكون الوثيقة واضحة ومقروءة

الرجاء الرد بصيغة JSON التالية فقط:
{
  "isValid": true/false,
  "confidence": 0.0-1.0,
  "documentType": "نوع الوثيقة المحدد",
  "reasoning": "شرح موجز لتحديدك"
}`;

    // Call OpenAI Vision API
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: base64Image
              }
            }
          ]
        }
      ],
      max_tokens: 500,
      temperature: 0.3
    });

    // Parse the response
    const content = response.choices[0].message.content;
    console.log('OpenAI Response:', content);
    
    // Extract JSON from response (handle markdown code blocks)
    let jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid response format from OpenAI');
    }
    
    const analysis = JSON.parse(jsonMatch[0]);

    return {
      isValid: analysis.isValid,
      message: analysis.reasoning,
      confidence: analysis.confidence,
      analysis: analysis.reasoning,
      aiResponse: analysis
    };

  } catch (error) {
    console.error('Error validating document with OpenAI:', error);
    
    // If OpenAI validation fails, we'll return a warning but allow the document
    return {
      isValid: true,
      message: 'Document accepted (AI validation unavailable)',
      confidence: 0.5,
      error: error.message,
      warning: 'Could not perform AI validation, document accepted for manual review'
    };
  }
}

/**
 * Validate multiple documents
 * @param {Array} files - Array of uploaded file objects
 * @returns {Promise<Object>} - Validation results for all files
 */
async function validateDocuments(files) {
  const results = {
    allValid: true,
    documents: [],
    invalidDocuments: []
  };

  for (const file of files) {
    // Get the expected document type
    const documentName = file.fieldname; // This comes from the form field name
    
    console.log(`Validating document: ${file.originalname} (Expected: ${documentName})`);
    
    // Validate the document
    const validationResult = await validateDocument(file, documentName);
    
    const documentResult = {
      fieldName: file.fieldname,
      originalName: file.originalname,
      expectedType: documentName,
      ...validationResult
    };
    
    results.documents.push(documentResult);
    
    // Track invalid documents
    if (!validationResult.isValid) {
      results.allValid = false;
      results.invalidDocuments.push({
        fileName: file.originalname,
        reason: validationResult.message
      });
    }
  }

  return results;
}

module.exports = {
  validateDocument,
  validateDocuments
};
