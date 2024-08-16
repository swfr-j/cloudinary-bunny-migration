import path from 'path';
import fs from 'fs';

const files = [
    path.resolve(__dirname, 'data.csv'),
    path.resolve(__dirname, 'check.csv'),
    path.resolve(__dirname, 'errors.csv'),
    path.resolve(__dirname, 'logs', 'combined.log'),
    path.resolve(__dirname, 'logs', 'error.log'),
]

// delete all the data inside the files
files.forEach(file => {
    fs.writeFileSync(file, '');
    console.log(`Deleted contents of ${file}`);
});