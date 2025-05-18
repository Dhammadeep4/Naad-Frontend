import React, { useEffect, useState } from "react";
import axios from "axios";
import { backendUrl } from "../App";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

import PaymentsTable from "../components/PaymentsTable.jsx";
const StudHomepage = ({ user, setUser }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState({});
  const [amount, setAmount] = useState(0);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [feesFlag, setFeesFlag] = useState(true);
  const [registrationFlag, setRegistrationFlag] = useState(true);
  const [registrationAmount, setRegistrationAmount] = useState(0);
  const [lastPaymentDate, setLastPaymentDate] = useState(false);

  const [pendingPayments, setPendingPayments] = useState(false);

  const [day, setDay] = useState();
  const remark = "Monthly Fee";
  const fetchProfile = async () => {
    try {
      const { student_id } = user;
      const res = await axios.get(
        `${backendUrl}/api/admin/studentProfile/${student_id}`
      );

      const profile = res.data.profile;

      if (profile.status === "inactive") {
        toast.error(
          "Your account is inactive. Please contact the administrator."
        );
        localStorage.removeItem("user"); // clear stored user
        setUser(null); // reset state if needed
        navigate("/login"); // redirect to login
        return; // stop further execution
      }
      setStudent(profile);
      fetchFees(profile.year);
      fetchFees("registration");
      fetchHistory(student_id);
    } catch (error) {
      console.error(error);
      navigate("/login");
      if (error.response?.status === 401 || error.response?.status === 403) {
        toast.error("Session expired or unauthorized. Please log in again.");
        localStorage.removeItem("user");
        setUser(null);
        navigate("/login");
      }
    }
  };

  const fetchFees = async (year) => {
    try {
      const formattedYear = year.toLowerCase().replace(/ /g, "_");
      // console.log("Fetching fees for year:" + formattedYear);
      const res = await axios.get(
        `${backendUrl}/api/fee/amount/${formattedYear}`
      );
      if (!res.data.success) {
        return toast.error(res.data.message || "Could not fetch fees.");
      }

      if (formattedYear === "registration") {
        // console.log("For registration setting amount:" + res.data.fee);
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
      console.error(error.message);
    }
  };
  const sortHistory = (history) => {
    try {
      // Separate pending entries
      const pendingPayments = history.filter(
        (item) => item.mode === "pending" && item.request === "pending"
      );
      // Valid payment history (excluding pending ones)
      const validPayments = history.filter(
        (item) => !(item.mode === "pending" && item.request === "pending")
      );

      // Sort the valid payments by date (descending)
      const sortedPayments = [...validPayments].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );

      const latestPaymentDate =
        sortedPayments.length > 0
          ? new Date(sortedPayments[0].createdAt)
          : null;

      // Set the cleaned-up and sorted history
      setPaymentHistory(sortedPayments);
      setLastPaymentDate(latestPaymentDate);

      // Save pending records separately
      setPendingPayments(pendingPayments); // <-- Make sure this state exists

      const currentDate = new Date();
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

            // console.log("Delay: " + monthsDelay);

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

  const handlePayment = async (amount, remarks) => {
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
        notes: {
          amount: amount,
          remark: remarks, // optional tracking info
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

  useEffect(() => {
    const init = async () => {
      await fetchProfile();
      setLoading(false);
    };
    init();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 to-red-200 p-4 sm:p-6 flex flex-col items-center overflow-x-hidden">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl p-4 sm:p-6">
        {/* Top bar */}
        <div className="mb-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-800">
              Student Dashboard
            </h2>
          </div>
          <div className="flex justify-end mt-2 sm:mt-0">
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-white font-medium text-xs px-3 py-1 rounded-md sm:text-sm sm:px-4 sm:py-2"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Profile */}
        <div className="text-center mb-6">
          <img
            src={student.image}
            alt="Student"
            className="w-24 h-24 sm:w-32 sm:h-32 mx-auto rounded-full object-cover border-4 border-blue-400"
          />
          <h3 className="text-lg sm:text-xl font-semibold mt-2">
            {student.firstname} {student.middlename} {student.lastname}
          </h3>
          <p className="text-gray-500 text-sm sm:text-base">{student.year}</p>
        </div>

        {/* Student Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm sm:text-base text-gray-700 mb-6">
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

        {/* Payment Button */}
        {feesFlag && (
          <div className="text-center mb-6">
            <button
              onClick={() =>
                handlePayment(
                  amount + (registrationFlag ? registrationAmount : 0),
                  remark
                )
              }
              className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-3 rounded-xl w-full sm:w-auto"
            >
              <div className="flex justify-center items-center gap-2">
                <span>
                  Pay Fees: ₹
                  {amount + (registrationFlag ? registrationAmount : 0)}
                </span>
                {registrationFlag && (
                  <span
                    className="text-xs sm:text-sm text-white bg-gray-600 rounded-full px-2 py-1"
                    title="₹250 registration fee is included"
                  >
                    ℹ️
                  </span>
                )}
              </div>
            </button>

            {lastPaymentDate && (
              <div className="mt-4 bg-green-100 border border-green-300 text-green-700 p-3 rounded-xl text-sm">
                Fees of previous months have been added to the pending amount
              </div>
            )}
          </div>
        )}

        {/* Pending Requests */}
        {pendingPayments && pendingPayments.length > 0 && (
          <div className="mt-4 bg-green-100 border border-green-300 text-green-700 p-4 rounded-xl text-sm sm:text-base">
            <div className="mb-2 font-semibold">
              A payment request is pending for the following:
            </div>

            <ul className="space-y-3 mb-3">
              {pendingPayments.map((p, index) => (
                <li
                  key={index}
                  className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2"
                >
                  <div>
                    <p>
                      <span className="font-medium">Request For:</span>{" "}
                      {p.payment_id || "N/A"}
                    </p>
                    <p>
                      <span className="font-medium">Amount:</span> ₹{p.amount}
                    </p>
                  </div>
                  <button
                    onClick={() => handlePayment(p.amount, p.remark)}
                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm w-full sm:w-auto"
                  >
                    Pay ₹{p.amount}
                  </button>
                </li>
              ))}
            </ul>

            <div className="font-semibold">
              Total Pending Amount: ₹
              {pendingPayments.reduce(
                (sum, p) => sum + Number(p.amount || 0),
                0
              )}
            </div>
          </div>
        )}

        {/* History Table */}
        <div className="mt-6 overflow-x-auto">
          <PaymentsTable paymentHistory={paymentHistory} student={student} />
        </div>
      </div>
    </div>
  );
};

export default StudHomepage;
