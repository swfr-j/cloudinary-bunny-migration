#!/usr/bin/env python3

import datetime
import os

csv_files = [
    "data.csv",
    "data_pg.csv",
    "errors.csv",
]

log_files = [
    "combined.log",
    "error.log",
]

date = datetime.datetime.now().strftime("%Y-%m-%d")

# if the folder 'csv_logs' does not exist, create it
if not os.path.exists("csv_logs"):
    os.makedirs("csv_logs")

# if the folder 'logs' does not exist, create it
if not os.path.exists("logs"):
    os.makedirs("logs")

for file in csv_files:
    # move csv files in the folder 'csv_logs' and add the current date
    # to the file name to create a backup
    try:
        new_file_name = f"csv_logs/{date}_{file}"

        old_file_path = os.path.join(os.getcwd(), file)
        new_file_path = os.path.join(os.getcwd(), new_file_name)

        os.rename(old_file_path, new_file_path)
    except FileNotFoundError:
        print(f"File {file} not found.")

os.chdir("logs")

for file in log_files:
    # move log files in the folder 'log_logs' and add the current date
    # to the file name to create a backup
    try:
        new_file_name = f"{date}_{file}"

        old_file_path = os.path.join(os.getcwd(), file)
        new_file_path = os.path.join(os.getcwd(), new_file_name)

        os.rename(old_file_path, new_file_path)
    except FileNotFoundError:
        print(f"File {file} not found.")
