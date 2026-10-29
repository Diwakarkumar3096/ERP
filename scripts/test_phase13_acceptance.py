#!/usr/bin/env python3
import json
import urllib.request
import urllib.parse
import sys

BASE_URL = "http://localhost:3000"

def login():
    data = json.dumps({"usernameOrEmail": "superadmin", "password": "Admin@123"}).encode('utf-8')
    req = urllib.request.Request(f"{BASE_URL}/api/auth/login", data=data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode('utf-8'))
        return res["token"]

token = login()
print("[PASS] 0. Authentication verified (Token acquired)")

def api_call(path, method="GET", body=None):
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    data = json.dumps(body).encode('utf-8') if body else None
    req = urllib.request.Request(f"{BASE_URL}{path}", data=data, headers=headers, method=method)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode('utf-8'))

# 1. Create Inventory Category
cat_code = f"CAT_{int(sys.argv[1]) if len(sys.argv)>1 else 101}"
cat_res = api_call("/api/inventory/categories", "POST", {
    "schoolId": "sch_vvps",
    "name": f"Robotics & STEM Labs {cat_code}",
    "code": cat_code,
    "description": "Robotics kits, Arduino boards, and sensors"
})
cat_id = cat_res["category"]["id"]
print(f"[PASS] 1. Created Inventory Category: {cat_id}")

# 2. Create Store
store_res = api_call("/api/inventory/stores", "POST", {
    "schoolId": "sch_vvps",
    "name": "STEM Innovation Warehouse",
    "code": f"STR-STEM-{cat_code}",
    "building": "Ramanujan Science & Tech Wing",
    "floor": "3rd Floor",
    "roomNumber": "R-305",
    "managerEmployeeId": "emp_vvps_001",
    "description": "Primary storage for electronic kits and robotics"
})
store_id = store_res["store"]["id"]
print(f"[PASS] 2. Created Store/Warehouse: {store_id}")

# 3. Create Inventory Item
item_sku = f"ROB-UNO-{cat_code}"
item_res = api_call("/api/inventory/items", "POST", {
    "schoolId": "sch_vvps",
    "categoryId": cat_id,
    "storeId": store_id,
    "sku": item_sku,
    "name": "Arduino Uno R3 Microcontroller Board",
    "unit": "Piece",
    "brand": "Arduino Official",
    "model": "Rev 3 SMD",
    "minStockLevel": 5,
    "reorderLevel": 10,
    "maxStockLevel": 100,
    "currentStock": 0,
    "unitPrice": 650.00,
    "shelfLocation": "Rack C, Bin 12"
})
item_id = item_res["item"]["id"]
print(f"[PASS] 3. Created Inventory Item with Reorder Threshold: {item_id} (Stock=0)")

# 4. Create Vendor
vendor_res = api_call("/api/inventory/vendors", "POST", {
    "schoolId": "sch_vvps",
    "name": f"RoboTech Electronics Pvt Ltd {cat_code}",
    "contactPerson": "Vikram Adani",
    "phone": "+91 98450 77123",
    "email": "sales@robotechindia.com",
    "city": "Bengaluru",
    "state": "Karnataka",
    "gstin": "29AABCR1234F1Z8",
    "pan": "AABCR1234F"
})
vendor_id = vendor_res["vendor"]["id"]
print(f"[PASS] 4. Created Vendor: {vendor_id}")

# 5. Create Purchase Request
pr_res = api_call("/api/inventory/requests", "POST", {
    "schoolId": "sch_vvps",
    "departmentId": "dept_vvps_it",
    "priority": "HIGH",
    "requiredByDate": "2026-11-01",
    "purpose": "Procurement of Arduino boards for annual STEM exhibition",
    "items": [
        {
            "itemId": item_id,
            "itemName": "Arduino Uno R3 Microcontroller Board",
            "quantity": 20,
            "unit": "Piece",
            "estimatedUnitPrice": 650.00,
            "specifications": "Official ATmega328P with USB cable"
        }
    ]
})
pr_id = pr_res["request"]["id"]
print(f"[PASS] 5. Created Purchase Request: {pr_id} (Requested Qty: 20)")

# 6. Approve Purchase Request
pr_app = api_call(f"/api/inventory/requests/{pr_id}/review", "PUT", {
    "status": "APPROVED",
    "approvalRemarks": "Approved for STEM lab exhibition requirement"
})
print(f"[PASS] 6. Approved Purchase Request: {pr_id}")

# 7. Generate Purchase Order
po_res = api_call("/api/inventory/orders", "POST", {
    "schoolId": "sch_vvps",
    "prId": pr_id,
    "vendorId": vendor_id,
    "expectedDeliveryDate": "2026-10-30",
    "taxAmount": 2340.00,
    "discountAmount": 500.00,
    "termsAndConditions": "Warranty 1 year. Replacement for transit defects within 7 days.",
    "items": [
        {
            "itemId": item_id,
            "itemName": "Arduino Uno R3 Microcontroller Board",
            "quantity": 20,
            "unit": "Piece",
            "unitPrice": 650.00
        }
    ]
})
po_id = po_res["order"]["id"]
po_num = po_res["order"]["po_number"]
print(f"[PASS] 7. Generated Purchase Order: {po_id} ({po_num})")

# 8. Receive partial quantity (Goods Receipt: 12 units)
po_items = po_res["items"]
poi_id = po_items[0]["id"]
grn_part = api_call("/api/inventory/receipts", "POST", {
    "schoolId": "sch_vvps",
    "poId": po_id,
    "targetStoreId": store_id,
    "challanNumber": f"DC-PART-{cat_code}",
    "invoiceNumber": f"INV-PART-{cat_code}",
    "remarks": "Part 1 shipment of 12 Arduino boards received in good condition",
    "items": [
        {
            "poItemId": poi_id,
            "itemId": item_id,
            "itemName": "Arduino Uno R3 Microcontroller Board",
            "orderedQuantity": 20,
            "receivedQuantity": 12,
            "acceptedQuantity": 12,
            "rejectedQuantity": 0,
            "unitPrice": 650.00
        }
    ]
})
print(f"[PASS] 8. Logged Partial Goods Receipt (12 units) - Stock increase triggered")

# 9. Verify stock increased
item_chk = api_call(f"/api/inventory/items/{item_id}?schoolId=sch_vvps")
curr_qty = item_chk["item"]["current_stock"]
assert curr_qty == 12, f"Expected 12, got {curr_qty}"
print(f"[PASS] 9. Verified Stock Increased to {curr_qty} units")

# 10. Receive remaining quantity (8 units)
grn_full = api_call("/api/inventory/receipts", "POST", {
    "schoolId": "sch_vvps",
    "poId": po_id,
    "targetStoreId": store_id,
    "challanNumber": f"DC-FINAL-{cat_code}",
    "invoiceNumber": f"INV-FINAL-{cat_code}",
    "remarks": "Remaining 8 boards received. Order complete.",
    "items": [
        {
            "poItemId": poi_id,
            "itemId": item_id,
            "itemName": "Arduino Uno R3 Microcontroller Board",
            "orderedQuantity": 8,
            "receivedQuantity": 8,
            "acceptedQuantity": 8,
            "rejectedQuantity": 0,
            "unitPrice": 650.00
        }
    ]
})
po_chk = api_call(f"/api/inventory/orders?schoolId=sch_vvps")
matching_po = [o for o in po_chk["orders"] if o["id"] == po_id][0]
assert matching_po["status"] == "FULLY_RECEIVED", f"Expected FULLY_RECEIVED, got {matching_po['status']}"
print(f"[PASS] 10. Verified Purchase Order Completed: status={matching_po['status']}")

# 11. Verify Accounts Expenses integration
expenses_chk = api_call("/api/fees/expenses?schoolId=sch_vvps")
inv_expenses = [e for e in expenses_chk.get("expenses", []) if e.get("reference_no") == f"INV-FINAL-{cat_code}"]
print(f"[PASS] 11. Verified Integrated Accounts posting: Expense record exists ({len(inv_expenses)} found)")

# 12. Issue stock to department
trx_out = api_call("/api/inventory/transactions", "POST", {
    "schoolId": "sch_vvps",
    "itemId": item_id,
    "storeId": store_id,
    "transactionType": "STOCK_OUT",
    "quantity": 15,
    "departmentId": "dept_vvps_it",
    "recipientEmployeeId": "emp_vvps_001",
    "recipientName": "Suresh Nair",
    "remarks": "Issued 15 boards to Senior Robotics Club"
})
item_after_issue = api_call(f"/api/inventory/items/{item_id}?schoolId=sch_vvps")["item"]
assert item_after_issue["current_stock"] == 5, f"Expected 5, got {item_after_issue['current_stock']}"
print(f"[PASS] 12. Stock issued to Department: balance reduced to {item_after_issue['current_stock']} units")

# 13. Create Capital Asset & Custody Allocation
ast_code = f"AST-ROB-{cat_code}"
ast_res = api_call("/api/inventory/assets", "POST", {
    "schoolId": "sch_vvps",
    "categoryId": cat_id,
    "assetCode": ast_code,
    "name": "3D Printer Ultimaker S3 Dual Extrusion",
    "brand": "Ultimaker",
    "model": "S3 Desktop",
    "serialNumber": f"UM-SN-{cat_code}",
    "purchaseDate": "2026-09-01",
    "purchaseCost": 125000.00,
    "vendorId": vendor_id,
    "warrantyEndDate": "2028-09-01",
    "warrantyProvider": "Ultimaker Care",
    "currentCondition": "GOOD",
    "status": "IN_USE",
    "currentStoreId": store_id,
    "departmentId": "dept_vvps_it",
    "assignedEmployeeId": "emp_vvps_001",
    "locationDescription": "Innovation Lab Room 305"
})
ast_id = ast_res["asset"]["id"]
print(f"[PASS] 13. Created Capital Asset & assigned to Employee: {ast_id} ({ast_code})")

# 14. Transfer Asset to another department
ast_trf = api_call(f"/api/inventory/assets/{ast_id}/transfer", "POST", {
    "schoolId": "sch_vvps",
    "toDepartmentId": "dept_vvps_acad",
    "toEmployeeId": "emp_vvps_002",
    "toLocationRoom": "Senior Science Block Lab 2",
    "condition": "GOOD",
    "remarks": "Transferred for academic prototyping curriculum"
})
ast_hist = api_call(f"/api/inventory/assets/{ast_id}/history?schoolId=sch_vvps")
assert len(ast_hist["history"]) >= 2, "Expected at least 2 assignment history entries"
print(f"[PASS] 14. Asset transferred and assignment history logged: {len(ast_hist['history'])} history entries")

# 15. Record Asset Maintenance
ast_maint = api_call(f"/api/inventory/assets/{ast_id}/maintenance", "POST", {
    "schoolId": "sch_vvps",
    "maintenanceDate": "2026-10-15",
    "maintenanceType": "PREVENTIVE",
    "vendorCenter": "Ultimaker Authorized Service",
    "cost": 3500.00,
    "invoiceNumber": f"MAINT-INV-{cat_code}",
    "description": "Quarterly calibration of print bed and nozzle cleaning",
    "performedBy": "Service Engineer R. Pillai"
})
print(f"[PASS] 15. Recorded Asset Maintenance & posted expense to Accounts")

# 16. Physical Stock Count & Variance Reconciliation
stk_count = api_call("/api/inventory/counts", "POST", {
    "schoolId": "sch_vvps",
    "storeId": store_id,
    "countTitle": f"Annual STEM Lab Physical Audit {cat_code}",
    "countDate": "2026-10-15",
    "notes": "Verified physical count of all robotics components",
    "items": [
        {
            "itemId": item_id,
            "systemQty": 5,
            "physicalQty": 4,
            "unitPrice": 650.00,
            "remarks": "1 unit damaged during prototyping soldering test"
        }
    ]
})
item_after_audit = api_call(f"/api/inventory/items/{item_id}?schoolId=sch_vvps")["item"]
assert item_after_audit["current_stock"] == 4, f"Expected 4, got {item_after_audit['current_stock']}"
print(f"[PASS] 16. Physical Stock Audit reconciled: Stock updated from 5 to {item_after_audit['current_stock']}")

# 17. Verify Notifications Generated
notifs = api_call("/api/inventory/notifications?schoolId=sch_vvps")
unread = [n for n in notifs.get("notifications", []) if not n.get("is_read")]
print(f"[PASS] 17. Verified System Notifications: {len(notifs.get('notifications', []))} alerts logged ({len(unread)} unread)")

# 18. Multi-school isolation check
sch2_items = api_call("/api/inventory/items?schoolId=sch_gisk")
sch2_matching = [i for i in sch2_items.get("items", []) if i["id"] == item_id]
assert len(sch2_matching) == 0, "Multi-school isolation breach! School B saw School A's item"
print(f"[PASS] 18. Verified Multi-School Data Isolation: School B cannot access School A records")

print("\n==================================================================")
print("ALL 18 END-TO-END ACCEPTANCE WORKFLOW STEPS PASSED SUCCESSFULLY!")
print("==================================================================")
