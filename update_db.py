import os
import sys
import pandas as pd
import pathlib
import sys
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()

# FILENAME = "check_success.csv"
# FULLPATH = os.path.join(pathlib.Path(__file__).parent.absolute(), FILENAME)

FULLPATH = None

DB_URL = os.getenv("PY_POSTGRES_URL")

engine = create_engine(DB_URL)


def create_query(data):
    query = """
    UPDATE files
    SET url = 
        CASE
            {}
        END
    WHERE "cloudinaryId" IN ({});
    """.format(
        " ".join(
            [
                f"""WHEN "cloudinaryId" = '{row['public_id'].replace("'", "''")}' THEN '{row['bunny_url'].replace("'", "''")}'"""
                for _, row in data.iterrows()
            ]
        ),
        ", ".join([f"'{row['public_id'].replace("'", "''")}'" for _, row in data.iterrows()]),
    )

    return query


def read_file_in_chunks(file_path, chunk_size=500):
    """
    Generator function to read a file in chunks.

    :param file_path: Path to the file to be read.
    :param chunk_size: Number of bytes to read at a time (default is 1024).
    :yield: Chunk of the file.
    """
    for chunk in pd.read_csv(file_path, chunksize=chunk_size):
        yield chunk


def main():
    FULLPATH = sys.argv[1]

    if not os.path.exists(FULLPATH):
        print("File not found")
        sys.exit(1)

    # Create a transaction
    with engine.begin() as conn:
        # Read file in chunks of 50 lines
        for chunk in read_file_in_chunks(FULLPATH, chunk_size=50):
            query = create_query(chunk)
            query = text(query)
            print("Executing query", query)
            # Execute the query
            conn.execute(query)

        # rollback the transaction (for testing purposes)
        # conn.rollback()

    print("Done")


if __name__ == "__main__":
    main()
