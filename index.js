// Imports
import config from 'config';
import fs from 'fs';
import path from 'path';
import { PdfReader } from 'pdfreader';
import Docxtemplater from 'docxtemplater';
import mammoth from 'mammoth';
import { Configuration, OpenAIApi } from "openai";

// Read Configuration
const ChatGPT_API_Key = config.get("ChatGPT_API_Key");
const GPTOrgId = config.get("GPTOrgId");
const File_Folder = config.get("File_Folder");
const Max_GPT_Version = config.get("Max_GPT_Version");
const Text_Separator = config.get("Text_Separator");
const ChatGPT_Specs = config.get("ChatGPT_Specs");
const Prompts = config.get("Prompts");

// Set your OpenAI API key here
const configuration = new Configuration({
    organization: GPTOrgId,
    apiKey: ChatGPT_API_Key,
});
const openai = new OpenAIApi(configuration);

// ---- File reading helpers ----
async function readTextFile(filePath, callback) {
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.log('Error reading file:', err);
      return callback(err, null);
    }
    callback(null, data);
  });
}

// PDF reader rewritten as a promise
function readPDFFile(filePath) {
  return new Promise((resolve, reject) => {
    const textLines = [];
    const pdfReader = new PdfReader();

    pdfReader.parseFileItems(filePath, (err, item) => {
      if (err) {
        reject(err);
        return;
      }
      if (!item) {
        resolve(textLines.join('\n'));
      } else if (item.text) {
        textLines.push(item.text);
      }
    });
  });
}

function readWordFile(filePath, callback) {
  try {
    const data = fs.readFileSync(filePath, 'binary');
    const doc = new Docxtemplater();
    doc.loadZip(data);

    const content = doc.getFullText();
    callback(null, content);
  } catch (err) {
    console.error('Error reading Word file:', err);
    callback(err, null);
  }
}

function readDocFile(filePath, callback) {
  fs.readFile(filePath, 'binary', (err, data) => {
    if (err) {
      console.error('Error reading .doc file:', err);
      return callback(err, null);
    }

    mammoth.extractRawText({ buffer: data })
      .then(result => {
        const content = result.value;
        callback(null, content);
      })
      .catch(error => {
        console.error('Error extracting .doc contents:', error);
        callback(error, null);
      });
  });
}

// ---- Utility ----
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ---- Main processing logic ----

// SERIALIZED version: one file at a time
async function processFilesSerially(folderPath) {
  try {
    const files = await fs.promises.readdir(folderPath);

    for (const file of files) {
      const filePath = path.join(folderPath, file);
      const fileType = path.extname(file).toLowerCase();

      console.log(`\nProcessing file: ${file} (${fileType})`);

      switch (fileType) {
        case '.pdf': {
          try {
            const data = await readPDFFile(filePath);
            await processFile(data, filePath);
          } catch (err) {
            console.error(`Error reading PDF ${file}:`, err);
          }
          break;
        }

        case '.txt': {
          console.log(`${fileType} file detected. Supported but not processing. Skipping.`);
          break;
        }

        case '.doc': {
          console.log(`${fileType} file detected. Currently unsupported. Skipping.`);
          break;
        }

        case '.docx': {
          console.log(`${fileType} file detected. Currently unsupported. Skipping.`);
          break;
        }

        default: {
          console.log(`Unsupported file type: ${fileType}. Skipping.`);
          break;
        }
      }

      // Optional delay between files
      await sleep(500); // adjust delay if needed
    }

    console.log('\n✅ Finished processing all files (one by one)');
  } catch (err) {
    console.error('Error reading folder:', err);
  }
}

// ---- GPT call ----
async function generateChatResponse(system, userPrompt) {
  console.log();
  console.log("entering generateChatResponse");

  try {
    const response = await openai.createChatCompletion({
      model: 'gpt-4-turbo', // Change the model if needed
      temperature: 0.5,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 1200 // Adjust as needed
    });
    console.log("made chat call");

    console.log(response);
    console.log();
    console.log(response.data.choices[0]);

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Error generating response:', error.message);
    console.error(JSON.stringify(error, null, 2));
    return '';
  }
}

// ---- File processor ----
async function processFile(file, filePath) {
  file = file.replace(/(\r?\n)/g, " "); //Remove Carriage return / line feed
  file = file.replace(/(\r)/g, " "); // Remove Carriage return
  file = file.replace(/(\t)/g, " "); // Remove tabs
  file = file.replace(/‘/g, ""); // Remove ticks
  file = file.replace(/•/g, ""); // Remove bullets
  file = file.replace(/¨/g, ""); // Remove ¨

  // Reduce character count so we will have around 3500 tokens max
  file = file.substring(0, 14000);

  // check file size (tokens) and reduce size if needed
  for (const prompt of Prompts) {
    const userPrompt = prompt.Prompt + " " + "Resume: " + file;
    const response = await generateChatResponse(prompt.System, userPrompt);

    console.log("Write Response " + response);

    // Save the response to a file
    const fileName = filePath + "_" + prompt.Name + ".txt";
    fs.writeFile(fileName, response, (err) => {
      if (err) {
        console.error('Error saving response to file:', err);
      } else {
        console.log('Response saved to', fileName);
      }
    });
  }
}

// ---- Start processing ----
processFilesSerially(File_Folder);
