# This script extracts data from the philgeps.csv file and creates parquet files for each column.

create table philgeps as select * from 'philgeps.csv';
COPY (select uuid() as id,area_of_delivery, count(*) as count, sum(contract_amount) as total, min(award_date) as start_date, max(award_date) as end_date from philgeps where area_of_delivery is not null group by area_of_delivery) TO 'area_of_deliveries.parquet' (FORMAT PARQUET);
COPY (select uuid() as id,awardee_name, count(*) as count, sum(contract_amount) as total, min(award_date) as start_date, max(award_date) as end_date from philgeps where awardee_name is not null group by awardee_name) TO 'awardees.parquet' (FORMAT PARQUET);
COPY (select uuid() as id,business_category, count(*) as count, sum(contract_amount) as total, min(award_date) as start_date, max(award_date) as end_date from philgeps group by business_category) TO 'business_categories.parquet' (FORMAT PARQUET);
COPY (select uuid() as id,organization_name, count(*) as count, sum(contract_amount) as total, min(award_date) as start_date, max(award_date) as end_date from philgeps group by organization_name) TO 'organizations.parquet' (FORMAT PARQUET);
