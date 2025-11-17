# This script extracts data from the philgeps.csv file and creates parquet files for each column.

create table philgeps as select * from 'philgeps.csv';
COPY (select uuid() as id,area_of_delivery from philgeps where area_of_delivery is not null group by area_of_delivery) TO 'area_of_deliveries.parquet' (FORMAT PARQUET);
COPY (select uuid() as id,awardee_name from philgeps where awardee_name is not null group by awardee_name) TO 'awardees.parquet' (FORMAT PARQUET);
COPY (select uuid() as id,business_category from philgeps where business_category is not null group by business_category) TO 'business_categories.parquet' (FORMAT PARQUET);
COPY (select uuid() as id,organization_name from philgeps where organization_name is not null group by organization_name) TO 'organizations.parquet' (FORMAT PARQUET);
