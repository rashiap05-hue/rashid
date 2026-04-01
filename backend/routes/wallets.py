from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from db import db, get_current_user
import uuid
from datetime import datetime, timezone
from pathlib import Path

wallets_router = APIRouter(prefix="/wallets", tags=["Wallets"])

PROOF_UPLOADS_DIR = Path("/app/backend/uploads/payment_proofs")
PROOF_UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

STATEMENT_UPLOADS_DIR = Path("/app/backend/uploads/statements")
STATEMENT_UPLOADS_DIR.mkdir(parents=True, exist_ok=True)


# --- WALLET CRUD ---

@wallets_router.get("/my")
async def get_my_wallet(current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("id") or current_user.get("user_id")
    wallet = await db.wallets.find_one({"user_id": user_id}, {"_id": 0})
    if not wallet:
        wallet = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "balance": 0.0,
            "currency": "AED",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.wallets.insert_one(wallet)
        wallet.pop("_id", None)
    return wallet


@wallets_router.get("/all")
async def get_all_wallets(current_user: dict = Depends(get_current_user)):
    """Admin/Staff: Get all agent wallets"""
    role = current_user.get("role", "agent")
    if role not in ("admin", "staff"):
        raise HTTPException(status_code=403, detail="Not authorized")
    wallets = await db.wallets.find({}, {"_id": 0}).to_list(500)
    # Enrich with user info
    for w in wallets:
        user = await db.users.find_one({"id": w["user_id"]}, {"_id": 0, "password": 0})
        w["user"] = user or {}
    return wallets


@wallets_router.post("/topup")
async def topup_wallet(body: dict, current_user: dict = Depends(get_current_user)):
    """Admin/Staff: Credit an agent's wallet"""
    role = current_user.get("role", "agent")
    if role not in ("admin", "staff"):
        raise HTTPException(status_code=403, detail="Not authorized")

    agent_user_id = body.get("user_id")
    amount = float(body.get("amount", 0))
    note = body.get("note", "")

    if amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")

    wallet = await db.wallets.find_one({"user_id": agent_user_id})
    if not wallet:
        wallet_id = str(uuid.uuid4())
        await db.wallets.insert_one({
            "id": wallet_id, "user_id": agent_user_id,
            "balance": 0.0, "currency": "AED",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    now = datetime.now(timezone.utc).isoformat()
    await db.wallets.update_one(
        {"user_id": agent_user_id},
        {"$inc": {"balance": amount}}
    )

    txn = {
        "id": str(uuid.uuid4()),
        "wallet_user_id": agent_user_id,
        "type": "credit",
        "amount": amount,
        "note": note or "Wallet top-up",
        "performed_by": current_user.get("id") or current_user.get("user_id"),
        "performed_by_name": current_user.get("name", ""),
        "created_at": now,
    }
    await db.wallet_transactions.insert_one(txn)
    txn.pop("_id", None)

    updated = await db.wallets.find_one({"user_id": agent_user_id}, {"_id": 0})
    return {"success": True, "new_balance": updated["balance"], "transaction": txn}


@wallets_router.post("/debit")
async def debit_wallet(body: dict, current_user: dict = Depends(get_current_user)):
    """Debit from wallet (booking confirmation, admin adjustment)"""
    user_id = body.get("user_id") or current_user.get("id") or current_user.get("user_id")
    amount = float(body.get("amount", 0))
    note = body.get("note", "")
    txn_type = body.get("type", "debit")

    if amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")

    wallet = await db.wallets.find_one({"user_id": user_id}, {"_id": 0})
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")
    if wallet["balance"] < amount:
        raise HTTPException(status_code=400, detail="Insufficient balance")

    now = datetime.now(timezone.utc).isoformat()
    await db.wallets.update_one(
        {"user_id": user_id},
        {"$inc": {"balance": -amount}}
    )

    txn = {
        "id": str(uuid.uuid4()),
        "wallet_user_id": user_id,
        "type": txn_type,
        "amount": -amount,
        "note": note or "Booking debit",
        "performed_by": current_user.get("id") or current_user.get("user_id"),
        "performed_by_name": current_user.get("name", ""),
        "created_at": now,
    }
    await db.wallet_transactions.insert_one(txn)
    txn.pop("_id", None)

    updated = await db.wallets.find_one({"user_id": user_id}, {"_id": 0})
    return {"success": True, "new_balance": updated["balance"], "transaction": txn}


@wallets_router.post("/refund")
async def refund_wallet(body: dict, current_user: dict = Depends(get_current_user)):
    """Admin/Staff: Refund to agent wallet"""
    role = current_user.get("role", "agent")
    if role not in ("admin", "staff"):
        raise HTTPException(status_code=403, detail="Not authorized")

    agent_user_id = body.get("user_id")
    amount = float(body.get("amount", 0))
    note = body.get("note", "")

    if amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")

    now = datetime.now(timezone.utc).isoformat()
    await db.wallets.update_one(
        {"user_id": agent_user_id},
        {"$inc": {"balance": amount}}
    )

    txn = {
        "id": str(uuid.uuid4()),
        "wallet_user_id": agent_user_id,
        "type": "refund",
        "amount": amount,
        "note": note or "Refund",
        "performed_by": current_user.get("id") or current_user.get("user_id"),
        "performed_by_name": current_user.get("name", ""),
        "created_at": now,
    }
    await db.wallet_transactions.insert_one(txn)
    txn.pop("_id", None)

    updated = await db.wallets.find_one({"user_id": agent_user_id}, {"_id": 0})
    return {"success": True, "new_balance": updated["balance"], "transaction": txn}


# --- TRANSACTIONS ---

@wallets_router.get("/transactions")
async def get_my_transactions(current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("id") or current_user.get("user_id")
    txns = await db.wallet_transactions.find(
        {"wallet_user_id": user_id}, {"_id": 0}
    ).sort("created_at", -1).to_list(500)
    return txns


@wallets_router.get("/transactions/{user_id}")
async def get_user_transactions(user_id: str, current_user: dict = Depends(get_current_user)):
    """Admin/Staff: Get specific agent transactions"""
    role = current_user.get("role", "agent")
    if role not in ("admin", "staff"):
        raise HTTPException(status_code=403, detail="Not authorized")
    txns = await db.wallet_transactions.find(
        {"wallet_user_id": user_id}, {"_id": 0}
    ).sort("created_at", -1).to_list(500)
    return txns


# --- PAYMENT PROOFS ---

@wallets_router.post("/payment-proof")
async def upload_payment_proof(
    amount: str = Form(...),
    note: str = Form(""),
    reference: str = Form(""),
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user.get("id") or current_user.get("user_id")
    proof_id = str(uuid.uuid4())
    ext = file.filename.rsplit(".", 1)[-1] if "." in file.filename else "png"
    fname = f"{proof_id}.{ext}"
    fpath = PROOF_UPLOADS_DIR / fname
    content = await file.read()
    fpath.write_bytes(content)

    doc = {
        "id": proof_id,
        "user_id": user_id,
        "user_name": current_user.get("name", ""),
        "amount": float(amount),
        "note": note,
        "reference": reference,
        "file_url": f"/api/static/payment_proofs/{fname}",
        "file_name": file.filename,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "reviewed_by": None,
        "reviewed_at": None,
    }
    await db.payment_proofs.insert_one(doc)
    doc.pop("_id", None)
    return doc


@wallets_router.get("/payment-proofs/my")
async def get_my_payment_proofs(current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("id") or current_user.get("user_id")
    proofs = await db.payment_proofs.find(
        {"user_id": user_id}, {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return proofs


@wallets_router.get("/payment-proofs/all")
async def get_all_payment_proofs(current_user: dict = Depends(get_current_user)):
    """Admin/Staff: Get all payment proofs"""
    role = current_user.get("role", "agent")
    if role not in ("admin", "staff"):
        raise HTTPException(status_code=403, detail="Not authorized")
    proofs = await db.payment_proofs.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return proofs


@wallets_router.post("/payment-proofs/{proof_id}/review")
async def review_payment_proof(proof_id: str, body: dict, current_user: dict = Depends(get_current_user)):
    """Admin/Staff: Approve or reject payment proof"""
    role = current_user.get("role", "agent")
    if role not in ("admin", "staff"):
        raise HTTPException(status_code=403, detail="Not authorized")

    action = body.get("action")  # "approve" or "reject"
    if action not in ("approve", "reject"):
        raise HTTPException(status_code=400, detail="action must be approve or reject")

    proof = await db.payment_proofs.find_one({"id": proof_id}, {"_id": 0})
    if not proof:
        raise HTTPException(status_code=404, detail="Payment proof not found")

    now = datetime.now(timezone.utc).isoformat()
    reviewer_id = current_user.get("id") or current_user.get("user_id")

    await db.payment_proofs.update_one(
        {"id": proof_id},
        {"$set": {
            "status": "approved" if action == "approve" else "rejected",
            "reviewed_by": reviewer_id,
            "reviewed_by_name": current_user.get("name", ""),
            "reviewed_at": now,
        }}
    )

    # If approved, credit the agent's wallet
    if action == "approve":
        agent_user_id = proof["user_id"]
        wallet = await db.wallets.find_one({"user_id": agent_user_id})
        if not wallet:
            await db.wallets.insert_one({
                "id": str(uuid.uuid4()), "user_id": agent_user_id,
                "balance": 0.0, "currency": "AED",
                "created_at": now,
            })

        await db.wallets.update_one(
            {"user_id": agent_user_id},
            {"$inc": {"balance": proof["amount"]}}
        )

        txn = {
            "id": str(uuid.uuid4()),
            "wallet_user_id": agent_user_id,
            "type": "credit",
            "amount": proof["amount"],
            "note": f"Payment proof approved (Ref: {proof.get('reference', 'N/A')})",
            "performed_by": reviewer_id,
            "performed_by_name": current_user.get("name", ""),
            "created_at": now,
        }
        await db.wallet_transactions.insert_one(txn)

    return {"success": True, "status": "approved" if action == "approve" else "rejected"}


# --- STATEMENT UPLOAD (Admin/Staff) ---

@wallets_router.post("/statements/upload")
async def upload_statement(
    note: str = Form(""),
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """Admin/Staff: Upload bank statement for reconciliation"""
    role = current_user.get("role", "agent")
    if role not in ("admin", "staff"):
        raise HTTPException(status_code=403, detail="Not authorized")

    stmt_id = str(uuid.uuid4())
    ext = file.filename.rsplit(".", 1)[-1] if "." in file.filename else "pdf"
    fname = f"{stmt_id}.{ext}"
    fpath = STATEMENT_UPLOADS_DIR / fname
    content = await file.read()
    fpath.write_bytes(content)

    doc = {
        "id": stmt_id,
        "file_url": f"/api/static/statements/{fname}",
        "file_name": file.filename,
        "note": note,
        "uploaded_by": current_user.get("id") or current_user.get("user_id"),
        "uploaded_by_name": current_user.get("name", ""),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.statements.insert_one(doc)
    doc.pop("_id", None)
    return doc


@wallets_router.get("/statements")
async def get_statements(current_user: dict = Depends(get_current_user)):
    """Admin/Staff: Get all uploaded statements"""
    role = current_user.get("role", "agent")
    if role not in ("admin", "staff"):
        raise HTTPException(status_code=403, detail="Not authorized")
    stmts = await db.statements.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return stmts
