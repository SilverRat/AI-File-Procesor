# Batch File Processing Script

This script reads resumes from various file formats such as TXT, PDF, DOC, and DOCX, processes them, and generates responses using OpenAI's GPT-3.5 Turbo model. Each generated response is saved in it's own text file using the name of the original file with the prompt name appended.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Setup](#setup)
- [Usage](#usage)
- [Configuration](#configuration)
- [Supported File Types](#supported-file-types)
- [Notes](#notes)
- [License](#license)

## Prerequisites

- Node.js (developed on v18.12.0 (LTS))
- OpenAI API key
- Configuration details (explained in the [Configuration](#configuration) section)
- Resumes in supported formats (PDF, DOC, DOCX, TXT)

## Setup

1. Clone this repository or copy the project to your local machine.

2. Install dependencies by running the following command in the terminal:
~~~
npm install
~~~

## Usage
1. Open the config/default.json file and configure the necessary values (explained in the [Configuration](#configuration) section).

2. Place your resumes in the specified Resume_Folder path.

3. Run the script using the following command:
~~~
node index.js
~~~

## Configuration
Modify the configuration in the config/default.json file to set up the script:

- ChatGPT_API_Key: **Your OpenAI API key.**
- GPTOrgId: **Your OpenAI organization ID.**
- Resume_Folder: **Path to the folder containing resumes.**
- Prompts: **Array of prompts with system and name.**

The following configuration items should not need changes and may not be in use:
- Max_GPT_Version: Maximum GPT version to use.
- Text_Separator: Separator to use when processing text.
- ChatGPT_Specs: Array of GPT specifications (versions and max tokens).



## Supported File Types
The script supports the following file formats:

- .txt: txt files are parsed with the fs libarary.
- .pdf: PDF files are parsed using the PdfReader library.
- .docx: DOCX files are parsed using the Docxtemplater library. **Not Operational Yet
- .doc: DOC files are parsed using the Mammoth library. **Not Operational Yet

## Notes
The script processes resumes, generates responses, and saves them to files based on the provided prompts.
Some file formats might not be fully supported or implemented (as indicated in the code comments).
Make sure to stay within the OpenAI API usage limits and adjust the max_tokens value in the generateChatResponse function accordingly.

## License
This script is provided under the MIT License. Feel free to use, modify, and distribute it as needed.



