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
const Resume_Folder = config.get("Resume_Folder");
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

//Sanity Check
// dumpConfiguration();

// Lets find and loop through folders
readFilesInFolder(Resume_Folder);

async function readTextFile(filePath, callback) {
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.log('Error reading file:', err);
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
          /*
          readTextFile(filePath, (err, data) => {
            if (err) {
              console.error('Error reading file:', err);
              return;
            }
            //processResume(data,filePath);
          });
          */

          console.log(`${fileType} file detected. Supported but not processing. Skipping reading the file.`);
          break;
        case '.pdf':
           readPDFFile(filePath, (err, data) => {
                if (err) {
                  console.error('Error:', err);
                  return;
                }
                processResume(data,filePath);
              });
            break;
        case '.doc':
          /*
            readDocFile(filePath, (err, data) => {
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


async function generateChatResponse(system, userPrompt) {
  console.log();
  console.log("entering generateChatResponse");

  try {
    const response = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo', // Change the model if needed
      temperature: 0.0,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 400 // Adjust as needed - NOTE. This is the tokens to reserve for the RESpONSE!!!!
    });
    console.log("made chat call");
      
    console.log(response);
    console.log();
    console.log(response.data.choices[0]);

    return response.data.choices[0].message.content;
  } catch (error) {
      console.error('Error generating response:', error.message);
      console.error(JSON.stringify(error,null,2));
    return '';
  }
}

async function processResume(resume, filePath) {

  resume = resume.replace(/(\r?\n)/g, " "); //Remove Carriage return / line feed
  resume = resume.replace(/(\r)/g, " "); // Remove Carriage return
  resume = resume.replace(/(\t)/g, " "); // Remove tabs
  resume = resume.replace(/‘/g, ""); // Remove ticks
  resume = resume.replace(/•/g, ""); // Remove bullets
  resume = resume.replace(/¨/g, ""); // Remove ¨
  

  //Reduce character count so we will have around 3500 tokens max
  resume = resume.substring(0, 14000); 


  // check resume size (tokens) and reduce size if needed
  for (const prompt of Prompts) {

    const userPrompt = "Resume: " + resume + " " + prompt;
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
