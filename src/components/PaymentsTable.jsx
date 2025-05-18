import React, { useState } from "react";
import { toast } from "react-toastify";
import axios from "axios";
import { backendUrl } from "../App";
const PaymentsTable = ({ paymentHistory, student }) => {
  const ITEMS_PER_PAGE = 6;
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(paymentHistory.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentEntries = paymentHistory.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE
  );

  //function to download receipt
  const downloadReceipt = async (payment_id) => {
    try {
      const encodedId = encodeURIComponent(payment_id);
      const res = await axios.get(
        `${backendUrl}/api/v1/getReceipt/${encodedId}`
      );

      if (res.data.success && res.data.receipt) {
        const link = document.createElement("a");
        link.href = res.data.receipt; // Base64 URL from backend
        link.download = `Receipt_${student.firstname}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        toast.error(res.data.message || "Receipt not found.");
      }
    } catch (error) {
      toast.error("Failed to download receipt.");
      console.error(error.message);
    }
  };
  return (
    <div className="mt-8">
      <h4 className="text-lg font-semibold mb-2 text-gray-700">
        Payment History
      </h4>

      {paymentHistory.length === 0 ? (
        <p className="text-gray-500">No payment history available.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto border-collapse border border-gray-200 text-sm sm:text-base">
              <thead>
                <tr className="bg-gray-100 text-gray-700">
                  <th className="border border-gray-300 px-2 sm:px-4 py-2">
                    #
                  </th>
                  <th className="border border-gray-300 px-2 sm:px-4 py-2">
                    Payment ID
                  </th>
                  <th className="border border-gray-300 px-2 sm:px-4 py-2">
                    Timestamp
                  </th>
                  <th className="border border-gray-300 px-2 sm:px-4 py-2">
                    Remarks
                  </th>

                  <th className="border border-gray-300 px-2 sm:px-4 py-2">
                    Receipt
                  </th>
                </tr>
              </thead>
              <tbody>
                {currentEntries.map((entry, index) => (
                  <tr
                    key={entry.payment_id}
                    className="text-center hover:bg-gray-50 transition"
                  >
                    <td className="border border-gray-300 px-2 sm:px-4 py-2">
                      {startIndex + index + 1}
                    </td>
                    <td className="border border-gray-300 px-2 sm:px-4 py-2 break-all">
                      {entry.payment_id}
                    </td>
                    <td className="border border-gray-300 px-2 sm:px-4 py-2 whitespace-nowrap">
                      {entry.updatedAt
                        ? new Date(entry.updatedAt).toLocaleString("en-IN", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })
                        : "N/A"}
                    </td>
                    <td className="border border-gray-300 px-2 sm:px-4 py-2 break-all">
                      {entry.remark || "No Remarks"}
                    </td>
                    <td className="border border-gray-300 px-2 sm:px-4 py-2">
                      <button
                        onClick={() => downloadReceipt(entry.payment_id)}
                        className="bg-green-500 hover:bg-green-600 text-white text-xs sm:text-sm font-semibold py-1 sm:py-2 px-3 rounded-xl"
                      >
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex justify-center mt-4 space-x-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded disabled:opacity-50"
            >
              Previous
            </button>
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i + 1)}
                className={`px-3 py-1 rounded ${
                  currentPage === i + 1
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 hover:bg-gray-200"
                }`}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
              className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default PaymentsTable;
