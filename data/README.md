# Batch Video Input

Place CSV files here. Each file must have an "Item Number" column.

Example:
```
Item Number
123456789012
987654321098
112233445566
```

Run batch render:
  npm run render:batch -- --storeName=RenewFit
  npm run render:batch -- --storeName=RenewFit --file=data/listings.csv
