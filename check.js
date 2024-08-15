import axios from "axios";
import { csvReader } from "./csvHelpers";
import logger from "./logger";

const processBatch = (public_id, cloudinary_url, bunny_url) => {
    console.log("batch:", public_id, cloudinary_url, bunny_url);
}

const readCsvInBatches = async () => {
    try {
        await csvReader(processBatch);
        logger.info('CSV processing completed.');
    } catch (error) {
        logger.error('Error processing CSV:', error);
    }
};

readCsvInBatches();