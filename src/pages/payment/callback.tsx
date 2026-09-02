async function verifyPayment() {
  try {
    const params = new URLSearchParams(window.location.search);

    const transactionId = params.get("transaction_id");
    const txRef = params.get("tx_ref");
    const returnedStatus = params.get("status");

    console.log("Flutterwave callback:", {
      transactionId,
      txRef,
      returnedStatus,
    });

    if (
      returnedStatus?.toLowerCase() === "cancelled" ||
      returnedStatus?.toLowerCase() === "failed"
    ) {
      setStatus("failed");
      setMessage(
        "The payment was cancelled or failed. No money was added to your wallet."
      );
      return;
    }

    if (!transactionId) {
      setStatus("failed");
      setMessage(
        "Invalid Flutterwave transaction ID. Please contact support if money was deducted."
      );
      return;
    }

    if (!txRef) {
      setStatus("failed");
      setMessage(
        "Flutterwave payment reference was not found. Please contact support if money was deducted."
      );
      return;
    }

    setReference(txRef);

    // IMPORTANT: These names must match src/lib/api.ts
    const result = await verifyWalletFunding({
      transactionId: transactionId,
      txRef: txRef,
    });

    console.log("Verification result:", result);

    if (!result?.success) {
      setStatus("failed");
      setMessage(
        result?.message ||
          "We could not confirm this payment."
      );
      return;
    }

    setStatus("success");

    setMessage(
      result.message ||
        "Payment verified and your wallet has been funded successfully."
    );

    if (
      result.amount !== undefined &&
      result.amount !== null &&
      Number.isFinite(Number(result.amount))
    ) {
      setAmount(Number(result.amount));
    }

  } catch (error) {
    console.error(
      "Flutterwave callback verification error:",
      error
    );

    setStatus("failed");

    setMessage(
      error instanceof Error
        ? error.message
        : "Unable to verify this payment."
    );
  }
}
