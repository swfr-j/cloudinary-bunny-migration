import axios from "axios";
import { csvReader, csvErrorWriter } from "./csvHelpers";
import logger from "./logger";

const processBatch = async (public_id, cloudinary_url, bunny_url) => {
    if (!bunny_url) { return; }
    try {
        const res = await axios.head(bunny_url);

        if (res.status !== 200) {
            throw new Error(`Url not working: ${bunny_url}`);
        } else {
            logger.info(`Url working: ${bunny_url}`);
        }
    } catch (error) {
        logger.error(`Error checking URL: ${bunny_url}`, error);
        await csvErrorWriter.writeRecords([{ public_id, cloudinary_url, bunny_url, error: error.message }]);
    }
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