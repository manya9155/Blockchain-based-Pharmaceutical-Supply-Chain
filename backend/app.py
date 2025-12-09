from flask import Flask, request, jsonify
from flask_cors import CORS
from web3 import Web3
import json
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

# -----------------------
# Load ENV configuration
# -----------------------
INFURA_URL = os.getenv("WEB3_PROVIDER_URL")
CONTRACT_ADDRESS = os.getenv("CONTRACT_ADDRESS")
PRIVATE_KEY = os.getenv("PRIVATE_KEY")
PUBLIC_ADDRESS = os.getenv("PUBLIC_ADDRESS")  # Optional — but helpful

w3 = Web3(Web3.HTTPProvider(INFURA_URL))
if not w3.is_connected():
    raise Exception("❌ Web3 provider could not connect")

# -----------------------
# Load ABI
# -----------------------
with open("contract_abi.json") as f:
    contract_abi = json.load(f)

contract = w3.eth.contract(
    address=Web3.to_checksum_address(CONTRACT_ADDRESS),
    abi=contract_abi
)

chain_id = w3.eth.chain_id


# ============================================================
#  TEST ROUTE - CHECK CONNECTION
# ============================================================
@app.route("/api/name", methods=["GET"])
def get_name():
    try:
        result = contract.functions.name().call()
        return jsonify({"contract_name": result})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============================================================
# 1. CREATE BATCH
# ============================================================

@app.route("/api/create_batch", methods=["POST"])
def create_batch():
    data = request.json

    batch_id = Web3.keccak(text=data["batch_id"])   # convert ID → bytes32
    drug_name = data["drug_name"]
    dosage_form = data["dosage_form"]
    strength = data["strength"]
    manufacturer = data["manufacturer"]
    mfg_date = int(data["mfg_date"])
    exp_date = int(data["exp_date"])
    first_location = data["first_location"]

    account = Web3.to_checksum_address(PUBLIC_ADDRESS)
    nonce = w3.eth.get_transaction_count(account)

    txn = contract.functions.createBatch(
        batch_id,
        drug_name,
        dosage_form,
        strength,
        manufacturer,
        mfg_date,
        exp_date,
        first_location
    ).build_transaction({
        "from": account,
        "nonce": nonce,
        "gas": 500000,
        "gasPrice": w3.to_wei("2", "gwei")
    })

    signed_txn = w3.eth.account.sign_transaction(txn, private_key=PRIVATE_KEY)
    tx_hash = w3.eth.send_raw_transaction(signed_txn.raw_transaction)

    return jsonify({"tx_hash": tx_hash.hex()})


# ============================================================
# 2. TRANSFER BATCH
# ============================================================

@app.route("/api/transfer_batch", methods=["POST"])
def transfer_batch():
    data = request.json

    batch_id = Web3.keccak(text=data["batch_id"])
    to_address = Web3.to_checksum_address(data["to"])
    location = data["location"]
    note = data["note"]

    account = Web3.to_checksum_address(PUBLIC_ADDRESS)
    nonce = w3.eth.get_transaction_count(account)

    txn = contract.functions.transferBatch(
        batch_id,
        to_address,
        location,
        note
    ).build_transaction({
        "from": account,
        "nonce": nonce,
        "gas": 500000,
        "gasPrice": w3.to_wei("2", "gwei")
    })

    signed_txn = w3.eth.account.sign_transaction(txn, private_key=PRIVATE_KEY)
    tx_hash = w3.eth.send_raw_transaction(signed_txn.raw_transaction)

    return jsonify({"tx_hash": tx_hash.hex()})


# ============================================================
# 3. UPDATE STATUS (Active / Recalled / Dispensed)
# ============================================================

@app.route("/api/update_status", methods=["POST"])
def update_status():
    data = request.json

    batch_id = Web3.keccak(text=data["batch_id"])
    new_status = int(data["status"])  # 0=Active, 1=Recalled, 2=Dispensed

    account = Web3.to_checksum_address(PUBLIC_ADDRESS)
    nonce = w3.eth.get_transaction_count(account)

    txn = contract.functions.updateStatus(batch_id, new_status).build_transaction({
        "from": account,
        "nonce": nonce,
        "gas": 500000,
        "gasPrice": w3.to_wei("2", "gwei")
    })

    signed_txn = w3.eth.account.sign_transaction(txn, private_key=PRIVATE_KEY)
    tx_hash = w3.eth.send_raw_transaction(signed_txn.raw_transaction)

    return jsonify({"tx_hash": tx_hash.hex()})


# ============================================================
# 4. GET BATCH DETAILS
# ============================================================

@app.route("/api/get_batch", methods=["GET"])
def get_batch():
    batch_id = Web3.keccak(text=request.args.get("batch_id"))

    try:
        batch = contract.functions.batches(batch_id).call()

        result = {
            "drug_name": batch[0],
            "dosage_form": batch[1],
            "strength": batch[2],
            "manufacturer": batch[3],
            "mfg_date": batch[4],
            "exp_date": batch[5],
            "current_owner": batch[6],
            "status": batch[7],
            "exists": batch[8]
        }

        return jsonify(result)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============================================================
# 5. GET FULL BATCH HISTORY
# ============================================================

@app.route("/api/get_history", methods=["GET"])
def get_history():
    batch_id = Web3.keccak(text=request.args.get("batch_id"))

    try:
        history = contract.functions.getBatchHistory(batch_id).call()

        records = []
        for rec in history:
            records.append({
                "from": rec[0],
                "to": rec[1],
                "timestamp": rec[2],
                "location": rec[3],
                "note": rec[4]
            })

        return jsonify(records)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============================================================

if __name__ == "__main__":
    app.run(debug=True)
