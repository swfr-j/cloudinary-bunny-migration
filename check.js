import path from 'path';    
import axios from "axios";
import { csvReader, csvWriter } from "./csvHelpers";
import logger from "./logger";

const csvErrorFilePath = path.resolve(__dirname, 'errors.csv');
const csvCheckedFilePath = path.resolve(__dirname, 'check.csv');
const csvFilePath = path.resolve(__dirname, 'data.csv');

const processBatch = async (public_id, cloudinary_url, bunny_url) => {
    if (!bunny_url) { return; }
    try {
        const res = await axios.head(bunny_url);

        if (res.status !== 200) {
            throw new Error(`Url not working: ${bunny_url}`);
        } 
        logger.info(`Url working: ${bunny_url}`);
        await csvWriter(csvCheckedFilePath).writeRecords([{ public_id, cloudinary_url, bunny_url }]);
    } catch (error) {
        logger.error(`Error checking URL: ${bunny_url}`, error);
        await csvWriter(csvErrorFilePath).writeRecords([{ public_id, cloudinary_url, bunny_url, error: error.message }]);
    }
}

const readCsvInBatches = async () => {
    try {
        await csvReader(csvFilePath, processBatch);
        logger.info('CSV processing completed.');
    } catch (error) {
        logger.error('Error processing CSV:', error);
    }
};

readCsvInBatches();