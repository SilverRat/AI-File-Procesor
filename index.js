// This app is a fairly fixed workflow
// config
//      ChatGPT API Key
//      Folder to process
//      Max GPT version to use
//
//      ChatGPTSpecs Array
//          GPT version
//          GPT Max token size
//
//      Prompt Array
//          Prompt Name
//          Prompt

// 1. Open a folder specified in the config.

// 2. Loop through all files in the folder.

// 3. If the file is a Word or PDF Doc, Open it and read the text

// 4. if the text is over Token Max (4096) trim the text down to 4096- desired response buffer size.

// 5. Start a new conversatin and Provide the resume text 

// 6. Provide the prompt

// 7. Save the response as filename-response.txt

// 8. loop to next file.


// Imports
import config from 'config';
import fs from 'fs';
import path from 'path';
import { PdfReader } from 'pdfreader';
import Docxtemplater from 'docxtemplater';
import mammoth from 'mammoth';

// Read Configuration
const ChatGPT_API_Key = config.get("ChatGPT_API_Key");
const Resume_Folder = config.get("Resume_Folder");
const Max_GPT_Version = config.get("Max_GPT_Version");
const Text_Separator = config.get("Text_Separator");
const ChatGPT_Specs = config.get("ChatGPT_Specs");
const Prompts = config.get("Prompts");

//Sanity Check
// dumpConfiguration();

// Lets find and loop through folders
readFilesInFolder(Resume_Folder);

async function readTextFile(filePath, callback) {
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading file:', err);
      return callback(err, null);
    }
    callback(null, data);
  });
}

async function readPDFFile(filePath, callback) {
  const textLines = [];
  const pdfReader = new PdfReader();

  pdfReader.parseFileItems(filePath, (err, item) => {
    if (err) {
      console.error('Error reading PDF file:', err);
      return callback(err, null);
    }

    if (!item) {
      const content = textLines.join('\n');
      callback(null, content);
    } else if (item.text) {
      textLines.push(item.text);
    }
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



function readFilesInFolder(folderPath) {
  fs.readdir(folderPath, (err, files) => {
    if (err) {
      console.error('Error reading folder:', err);
      return;
    }

    files.forEach(file => {
      const filePath = path.join(folderPath, file);
      const fileType = path.extname(file).toLowerCase();

      console.log(`File: ${file}`);
      console.log(`Type: ${fileType}`);

      switch (fileType) {
        case '.txt':
          readTextFile(filePath, (err, data) => {
            if (err) {
              console.error('Error reading file:', err);
              return;
            }
            console.log(`Content of ${file}:`);
            console.log(data);
          });
          break;

        case '.pdf':
           readPDFFile(filePath, (err, data) => {
                if (err) {
                  console.error('Error:', err);
                  return;
                }
                console.log(`Content of ${file}:`);
                console.log(data);
              });

            break;
        case '.doc':
            readDocFile(filePath, (err, data) => {
                if (err) {
                  console.error('Error:', err);
                  return;
                }
                console.log(`Content of ${file}:`);
                console.log(data);
              });

          //console.log(`${fileType} file detected. Currently unsupported. Skipping reading the file.`);
          break;
        case '.docx':
            /*
            readWordFile(filePath, (err, data) => {
                if (err) {
                  console.error('Error:', err);
                  return;
                }
                console.log(`Content of ${file}:`);
                console.log(data);
              });
              */
          console.log(`${fileType} file detected. Currently unsupported. Skipping reading the file.`);
          break;

        default:
          console.log('Unsupported file type. Skipped reading the file.');
      }
    });
  });
}



//Helper function
function dumpConfiguration() {
    console.log("******** Config **************");
    console.log("ChatGPT_API_Key: " + ChatGPT_API_Key);
    console.log("Resume_Folder: " + Resume_Folder); 
    console.log("Max_GPT_Version: " + Max_GPT_Version);
    console.log("Text_Separator: " + Text_Separator);
    console.log("ChatGPT_Specs: " + ChatGPT_Specs[0].Version + " " + ChatGPT_Specs[0].MaxTokens);
    console.log("Prompts: " + Prompts[0].Name + " " + Prompts[0].Prompt);
}
