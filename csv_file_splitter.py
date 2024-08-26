"""
Splits a csv file into files of 10MB max each.
"""

# TODO: Test this code

import pandas as pd
import os
import sys


def split_csv(file_path, max_lines=50000):
    # Read the CSV file into a DataFrame
    df = pd.read_csv(file_path)

    # Get the number of lines in the CSV file
    num_lines = df.shape[0]

    # Calculate the number of files to be created
    num_files = num_lines // max_lines
    if num_lines % max_lines != 0:
        num_files += 1

    # Split the DataFrame into chunks
    chunks = [df[i : i + max_lines] for i in range(0, num_lines, max_lines)]

    # Create a directory to store the split files
    dir_name = os.path.splitext(file_path)[0]
    os.makedirs(dir_name, exist_ok=True)

    # Write the chunks to separate CSV files
    for i, chunk in enumerate(chunks):
        chunk.to_csv(os.path.join(dir_name, f"part_{i}.csv"), index=False)

    print(f"Split the file {file_path} into {num_files} files.")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python csv_file_splitter.py <file_path>")
        sys.exit(1)

    file_path = sys.argv[1]

    if not os.path.exists(file_path):
        print(f"File {file_path} not found.")
        sys.exit(1)

    split_csv(file_path)
