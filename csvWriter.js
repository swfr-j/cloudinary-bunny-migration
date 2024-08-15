import path from 'path';
import { createObjectCsvWriter } from 'csv-writer';
import fs from 'fs';

const csvFilePath = path.resolve(__dirname, 'data.csv');
const csvWriter = createObjectCsvWriter({
    path: csvFilePath,
    header: [
        { id: 'public_id', title: 'public_id' },
        { id: 'cloudinary_url', title: 'cloudinary_url' },
        { id: 'bunny_url', title: 'bunny_url' }
    ],
    append: fs.existsSync(csvFilePath), // Append if the file already exists
});


export default csvWriter;