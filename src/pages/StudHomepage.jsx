import React, { useEffect, useState } from "react";
import axios from "axios";
import { backendUrl } from "../App";
import { toast } from "react-toastify";

const StudHomepage = ({ user, setUser }) => {
  const [student, setStudent] = useState({});
  const [amount, setAmount] = useState(0);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [feesFlag, setFeesFlag] = useState(true);
  const [registrationFlag, setRegistrationFlag] = useState(true);
  const [registrationAmount, setRegistrationAmount] = useState(0);
  const [lastPaymentDate, setLastPaymentDate] = useState(false);
  const [day, setDay] = useState();
  const fetchProfile = async () => {
    try {
      const { student_id } = user;
      const res = await axios.get(
        `${backendUrl}/api/admin/studentProfile/${student_id}`
      );
      setStudent(res.data.profile);
      fetchFees(res.data.profile.year);
      fetchFees("registration");
      fetchHistory(student_id);
    } catch (error) {
      toast.error("Failed to fetch profile.");
      console.error(error.message);
    }
  };

  const fetchFees = async (year) => {
    try {
      const formattedYear = year.toLowerCase().replace(/ /g, "_");
      console.log("Fetching fees for year:" + formattedYear);
      const res = await axios.get(
        `${backendUrl}/api/fee/amount/${formattedYear}`
      );
      if (!res.data.success) {
        return toast.error(res.data.message || "Could not fetch fees.");
      }

      if (formattedYear === "registration") {
        console.log("For registration setting amount:" + res.data.fee);
        setRegistrationAmount(Number(res.data.fee));
      } else {
        setAmount(Number(res.data.fee));
      }
    } catch (error) {
      toast.error("Error fetching fees.");
      console.error(error.message);
    }
  };

  const fetchHistory = async (student_id) => {
    try {
      const res = await axios.get(
        `${backendUrl}/api/v1/getStudentHistory/${student_id}`
      );
      if (res.data.success) {
        if (res.data.history.length > 0) {
          setRegistrationFlag(false);
        }
        sortHistory(res.data.history);
      } else {
        toast.warning("No payment history found.");
        const year = "registration";
        fetchFees(year);
        // Backend returned failure → treat as no history
      }
    } catch (error) {
      toast.error("Failed to fetch payment history.");
      console.error(error.message);
    }
  };
  const sortHistory = (history) => {
    try {
      const sortedPayments = [...history].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
      const latestPaymentDate =
        sortedPayments.length > 0
          ? new Date(sortedPayments[0].createdAt)
          : null;

      setPaymentHistory(sortedPayments);
      setLastPaymentDate(latestPaymentDate);

      const currentDate = new Date(); // for demo; use new Date() in prod
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();

      if (currentDate.getDate() >= 1) {
        if (
          latestPaymentDate &&
          latestPaymentDate.getMonth() === currentMonth &&
          latestPaymentDate.getFullYear() === currentYear
        ) {
          setFeesFlag(false); // Already paid this month
        } else {
          setFeesFlag(true);

          if (latestPaymentDate) {
            const monthsDelay =
              (currentYear - latestPaymentDate.getFullYear()) * 12 +
              (currentMonth - latestPaymentDate.getMonth());
            console.log("Delay:" + monthsDelay);
            if (monthsDelay > 1) {
              setLastPaymentDate(true);
              setAmount((prevAmount) => prevAmount * monthsDelay);
            }
          }
        }
      } else {
        setFeesFlag(false); // Before 1st of the month
      }
    } catch (error) {
      console.error("Error in sortHistory:", error);
    }
  };

  //sort payment History
  // const sortHistory = (history) => {
  //   try {
  //     const sortedPayments = [...history].sort(
  //       (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  //     );
  //     //Store the latest payment date (after sorting)
  //     const latestPaymentDate =
  //       sortedPayments.length > 0
  //         ? new Date(sortedPayments[0].createdAt)
  //         : null;
  //     setPaymentHistory(sortedPayments);
  //     setLastPaymentDate(latestPaymentDate);
  //     // Get current date
  //     const currentDate = new Date("2025/4/10");
  //     const feeDate = new Date(
  //       `${currentDate.getFullYear()}-${currentDate.getMonth() + 1}-5`
  //     );
  //     const dummyDate = new Date("2025/3/4");
  //     console.log("Current date:", currentDate);
  //     console.log("Fee Date:" + feeDate);
  //     console.log("Dummy Date:" + dummyDate);
  //     console.log("🕒 Latest Payment Date:", latestPaymentDate);
  //     if (dummyDate < feeDate) {
  //       setFeesFlag(true);
  //       if (currentDate > feeDate) {
  //         console.log("add penalty");
  //         const timeDifference = Math.abs(
  //           currentDate.getTime() - feeDate.getTime()
  //         );
  //         const daysDifference = Math.ceil(
  //           timeDifference / (1000 * 60 * 60 * 24)
  //         );
  //         console.log(daysDifference);
  //         if (daysDifference > 7) {
  //           setAmount(amount + 150);
  //         }
  //       }
  //     }
  //   } catch {}
  // };
  const handlePayment = async (amount) => {
    try {
      const { data: keyData } = await axios.get(`${backendUrl}/api/v1/getKey`);
      const { data: orderData } = await axios.post(
        `${backendUrl}/api/v1/payment/process`,
        { amount }
      );

      const options = {
        key: keyData.key,
        amount,
        currency: "INR",
        name: "Naad",
        description: "Fees Payment",
        order_id: orderData.order.id,
        callback_url: `${backendUrl}/api/v1/paymentVerification`,
        prefill: {
          name: student.firstname,
          email: student.email || "test@example.com",
          contact: student.contact || "9999999999",
        },
        theme: { color: "#F37254" },
      };

      const rzp = new Razorpay(options);
      rzp.open();
    } catch (error) {
      toast.error("Payment process failed.");
      console.error(error.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    setUser(null);
  };

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

  useEffect(() => {
    fetchProfile();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-6 flex flex-col items-center">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">
            Student Dashboard
          </h2>
          <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-xl"
          >
            Logout
          </button>
        </div>
        <div className="text-center mb-6">
          <img
            src={student.image}
            alt="Student"
            className="w-32 h-32 mx-auto rounded-full object-cover border-4 border-blue-400"
          />
          <h3 className="text-xl font-semibold mt-3">
            {student.firstname} {student.middlename} {student.lastname}
          </h3>
          <p className="text-gray-500">{student.year}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-700 mb-6">
          <p>
            <strong>Address:</strong> {student.address}
          </p>
          <p>
            <strong>Contact:</strong> {student.contact}
          </p>
          <p>
            <strong>DOB:</strong> {student.dob}
          </p>
          <p>
            <strong>DOJ:</strong> {student.doj}
          </p>
        </div>
        {feesFlag && (
          <div className="text-center mb-6">
            <button
              onClick={() =>
                handlePayment(
                  amount + (registrationFlag ? registrationAmount : 0)
                )
              }
              className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-3 rounded-xl"
            >
              <div className="flex justify-center items-center gap-2">
                <span>
                  Pay Fees: ₹
                  {amount + (registrationFlag ? registrationAmount : 0)}
                </span>
                {registrationFlag && (
                  <span
                    className="text-sm text-white bg-gray-600 rounded-full px-2 py-1 cursor-default"
                    title="₹250 registration fee is included"
                  >
                    ℹ️
                  </span>
                )}
              </div>
            </button>

            {lastPaymentDate && (
              <div className="mt-4 bg-green-100 border border-green-300 text-green-700 p-3 rounded-xl">
                Fees of previus months have been added to the pending amount
              </div>
            )}
          </div>
        )}
        {/* Payment History Table */}
        <div className="mt-8">
          <h4 className="text-lg font-semibold mb-2 text-gray-700">
            Payment History
          </h4>
          {paymentHistory.length === 0 ? (
            <p className="text-gray-500">No payment history available.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto border-collapse border border-gray-200">
                <thead>
                  <tr className="bg-gray-100 text-gray-700">
                    <th className="border border-gray-300 px-4 py-2">#</th>
                    <th className="border border-gray-300 px-4 py-2">
                      Payment ID
                    </th>
                    <th className="border border-gray-300 px-4 py-2">
                      Timestamp
                    </th>
                    <th className="border border-gray-300 px-4 py-2">
                      Receipt
                    </th>{" "}
                    {/* ✅ New column */}
                  </tr>
                </thead>
                <tbody>
                  {paymentHistory.map((entry, index) => (
                    <tr key={entry.payment_id} className="text-center">
                      <td className="border border-gray-300 px-4 py-2">
                        {index + 1}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {entry.payment_id}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {entry.createdAt
                          ? new Date(entry.createdAt).toLocaleString("en-IN", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })
                          : "N/A"}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        <button
                          onClick={() => downloadReceipt(entry.payment_id)}
                          className="bg-green-500 hover:bg-green-600 text-white text-xs font-semibold py-2 px-3 rounded-xl"
                        >
                          Download
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudHomepage;
