"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import AOS from "aos";
import "aos/dist/aos.css";

/* ═══════════════════════════════════════════════════════════════
   MATH HELPERS
   ═══════════════════════════════════════════════════════════════ */
const EPSILON = 0.01;
const round2 = (num) => Math.round((Number(num) + Number.EPSILON) * 100) / 100;

const formatMoney = (num) => {
  const val = round2(num || 0);
  return Number.isInteger(val) ? val.toString() : val.toFixed(2);
};

const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
const toBn = (str) =>
  String(str).replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)]);

const splitAmount = (total, count) => {
  if (count <= 0) return [];
  const base = round2(total / count);
  const shares = Array(count).fill(base);
  const distributed = round2(base * count);
  const remainder = round2(total - distributed);
  if (remainder !== 0) {
    shares[count - 1] = round2(shares[count - 1] + remainder);
  }
  return shares;
};

/* ═══════════════════════════════════════════════════════════════
   SLIP NUMBER HELPER
   ═══════════════════════════════════════════════════════════════ */
function SlipNum({ value, useBangla, prefix = "" }) {
  const num = formatMoney(value);
  const display = useBangla ? toBn(num) : num;
  return (
    <span>
      {prefix}
      {display}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SUMMARY SLIP
   ═══════════════════════════════════════════════════════════════ */
function SummarySlip({
  eventData,
  members,
  expenses,
  settlementData,
  transactions,
  totalCollected,
  totalExpense,
  groupFundBalance,
  useBangla,
}) {
  return (
    <div
      data-slip-page
      style={{
        width: "760px",
        background: "#FBF3E4",
        padding: "32px",
        fontFamily:
          "'Noto Serif Bengali', 'Kalpurush', 'SolaimanLipi', Georgia, serif",
        color: "#2B1810",
        position: "relative",
      }}
    >
      <div
        style={{
          border: "4px double #8B0000",
          padding: "28px 24px",
          background: "rgba(255, 253, 245, 0.6)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <div
            style={{
              fontSize: "30px",
              fontWeight: "900",
              color: "#8B0000",
              lineHeight: "1.25",
              wordBreak: "break-word",
              paddingBottom: "6px",
              borderBottom: "2px solid #8B0000",
              display: "inline-block",
              maxWidth: "100%",
            }}
          >
            {eventData.name || "Unnamed Event"}
          </div>
          <div
            style={{
              fontSize: "13px",
              fontWeight: "bold",
              color: "#5C3317",
              marginTop: "10px",
              letterSpacing: "0.5px",
            }}
          >
            সারসংক্ষেপ হিসাব স্লিপ
          </div>
          <div
            style={{
              fontSize: "11px",
              color: "#8B0000",
              marginTop: "4px",
              fontWeight: "bold",
            }}
          >
            {eventData.date
              ? `তারিখ: ${eventData.date}`
              : `জেনারেটেড: ${new Date().toLocaleDateString("en-GB")}`}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "8px",
            marginBottom: "20px",
            background: "#F5E6CE",
            padding: "12px",
            border: "1px solid #B22222",
            borderRadius: "4px",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: "10px",
                color: "#8B0000",
                fontWeight: "bold",
                marginBottom: "4px",
              }}
            >
              মোট সংগ্রহ
            </div>
            <div
              style={{
                fontSize: "20px",
                fontWeight: "900",
                color: "#2B6A3F",
              }}
            >
              ৳<SlipNum value={totalCollected} useBangla={useBangla} />
            </div>
          </div>
          <div
            style={{
              textAlign: "center",
              borderLeft: "1px dashed #B22222",
              borderRight: "1px dashed #B22222",
            }}
          >
            <div
              style={{
                fontSize: "10px",
                color: "#8B0000",
                fontWeight: "bold",
                marginBottom: "4px",
              }}
            >
              মোট খরচ
            </div>
            <div
              style={{
                fontSize: "20px",
                fontWeight: "900",
                color: "#8B0000",
              }}
            >
              ৳<SlipNum value={totalExpense} useBangla={useBangla} />
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: "10px",
                color: "#8B0000",
                fontWeight: "bold",
                marginBottom: "4px",
              }}
            >
              গ্রুপ ফান্ড
            </div>
            <div
              style={{
                fontSize: "20px",
                fontWeight: "900",
                color: groupFundBalance < -0.01 ? "#B22222" : "#2B6A3F",
              }}
            >
              ৳<SlipNum value={groupFundBalance} useBangla={useBangla} />
            </div>
          </div>
        </div>

        {/* Section 1: Expenses */}
        <div style={{ marginBottom: "18px" }}>
          <div
            style={{
              fontSize: "12px",
              fontWeight: "900",
              color: "#8B0000",
              marginBottom: "8px",
              paddingBottom: "4px",
              borderBottom: "2px solid #B22222",
              letterSpacing: "1px",
            }}
          >
            ১. খরচের বিবরণ
          </div>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "11px",
            }}
          >
            <thead>
              <tr style={{ background: "#EADBC8" }}>
                <th
                  style={{
                    border: "1px solid #B22222",
                    padding: "6px 4px",
                    width: "30px",
                    color: "#8B0000",
                    fontWeight: "900",
                  }}
                >
                  ক্রম
                </th>
                <th
                  style={{
                    border: "1px solid #B22222",
                    padding: "6px",
                    textAlign: "left",
                    color: "#8B0000",
                    fontWeight: "900",
                  }}
                >
                  বিবরণ
                </th>
                <th
                  style={{
                    border: "1px solid #B22222",
                    padding: "6px",
                    color: "#8B0000",
                    fontWeight: "900",
                  }}
                >
                  পরিমাণ
                </th>
                <th
                  style={{
                    border: "1px solid #B22222",
                    padding: "6px",
                    color: "#8B0000",
                    fontWeight: "900",
                  }}
                >
                  পেমেন্ট
                </th>
                <th
                  style={{
                    border: "1px solid #B22222",
                    padding: "6px",
                    color: "#8B0000",
                    fontWeight: "900",
                  }}
                >
                  ভোগকারী
                </th>
              </tr>
            </thead>
            <tbody>
              {expenses.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    style={{
                      border: "1px solid #B22222",
                      padding: "10px",
                      textAlign: "center",
                      color: "#8B0000",
                      fontStyle: "italic",
                    }}
                  >
                    কোনো খরচ নেই
                  </td>
                </tr>
              )}
              {expenses.map((exp, i) => {
                let payerName = "গ্রুপ ফান্ড";
                if (exp.paymentMethod === "single")
                  payerName =
                    members.find((m) => m.id === exp.singlePayerId)?.name ||
                    "—";
                else if (exp.paymentMethod === "multiple")
                  payerName = "একাধিক";
                const consumerNames =
                  exp.consumers.length === members.length
                    ? "সকল"
                    : exp.consumers
                        .map(
                          (cid) =>
                            members.find((m) => m.id === cid)?.name || "?"
                        )
                        .join(", ");
                return (
                  <tr
                    key={exp.id}
                    style={{
                      background: i % 2 === 0 ? "#FBF3E4" : "#F5E6CE",
                    }}
                  >
                    <td
                      style={{
                        border: "1px solid #B22222",
                        padding: "6px 4px",
                        textAlign: "center",
                        fontWeight: "bold",
                      }}
                    >
                      {useBangla ? toBn(i + 1) : i + 1}
                    </td>
                    <td
                      style={{
                        border: "1px solid #B22222",
                        padding: "6px",
                        wordBreak: "break-word",
                      }}
                    >
                      {exp.desc}
                    </td>
                    <td
                      style={{
                        border: "1px solid #B22222",
                        padding: "6px",
                        textAlign: "right",
                        fontWeight: "bold",
                        color: "#8B0000",
                        whiteSpace: "nowrap",
                      }}
                    >
                      ৳<SlipNum value={exp.amount} useBangla={useBangla} />
                    </td>
                    <td
                      style={{
                        border: "1px solid #B22222",
                        padding: "6px",
                        fontSize: "10px",
                      }}
                    >
                      {payerName}
                    </td>
                    <td
                      style={{
                        border: "1px solid #B22222",
                        padding: "6px",
                        fontSize: "10px",
                        maxWidth: "200px",
                        wordBreak: "break-word",
                      }}
                    >
                      {consumerNames}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Section 2: Member balances */}
        <div style={{ marginBottom: "18px" }}>
          <div
            style={{
              fontSize: "12px",
              fontWeight: "900",
              color: "#8B0000",
              marginBottom: "8px",
              paddingBottom: "4px",
              borderBottom: "2px solid #B22222",
              letterSpacing: "1px",
            }}
          >
            ২. সদস্যদের ব্যক্তিগত হিসাব
          </div>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "11px",
            }}
          >
            <thead>
              <tr style={{ background: "#EADBC8" }}>
                <th
                  style={{
                    border: "1px solid #B22222",
                    padding: "6px",
                    textAlign: "left",
                    color: "#8B0000",
                    fontWeight: "900",
                  }}
                >
                  নাম
                </th>
                <th
                  style={{
                    border: "1px solid #B22222",
                    padding: "6px",
                    color: "#8B0000",
                    fontWeight: "900",
                  }}
                >
                  ফান্ডে জমা
                </th>
                <th
                  style={{
                    border: "1px solid #B22222",
                    padding: "6px",
                    color: "#8B0000",
                    fontWeight: "900",
                  }}
                >
                  পকেট থেকে
                </th>
                <th
                  style={{
                    border: "1px solid #B22222",
                    padding: "6px",
                    color: "#8B0000",
                    fontWeight: "900",
                  }}
                >
                  ভোগ
                </th>
                <th
                  style={{
                    border: "1px solid #B22222",
                    padding: "6px",
                    color: "#8B0000",
                    fontWeight: "900",
                  }}
                >
                  চূড়ান্ত
                </th>
              </tr>
            </thead>
            <tbody>
              {Object.values(settlementData).map((data, i) => {
                const isRecv = data.net > 0.01;
                const isPay = data.net < -0.01;
                return (
                  <tr
                    key={data.id}
                    style={{
                      background: i % 2 === 0 ? "#FBF3E4" : "#F5E6CE",
                    }}
                  >
                    <td
                      style={{
                        border: "1px solid #B22222",
                        padding: "6px",
                        fontWeight: "bold",
                      }}
                    >
                      {data.name}
                    </td>
                    <td
                      style={{
                        border: "1px solid #B22222",
                        padding: "6px",
                        textAlign: "right",
                      }}
                    >
                      ৳<SlipNum value={data.deposit} useBangla={useBangla} />
                    </td>
                    <td
                      style={{
                        border: "1px solid #B22222",
                        padding: "6px",
                        textAlign: "right",
                      }}
                    >
                      ৳<SlipNum value={data.pocketPaid} useBangla={useBangla} />
                    </td>
                    <td
                      style={{
                        border: "1px solid #B22222",
                        padding: "6px",
                        textAlign: "right",
                      }}
                    >
                      ৳<SlipNum value={data.consumed} useBangla={useBangla} />
                    </td>
                    <td
                      style={{
                        border: "1px solid #B22222",
                        padding: "6px",
                        textAlign: "right",
                        fontWeight: "900",
                        color: isRecv
                          ? "#2B6A3F"
                          : isPay
                          ? "#8B0000"
                          : "#5C3317",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {isRecv ? "+" : isPay ? "-" : ""}৳
                      <SlipNum
                        value={Math.abs(data.net)}
                        useBangla={useBangla}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Section 3: Transactions */}
        <div style={{ marginBottom: "18px" }}>
          <div
            style={{
              fontSize: "12px",
              fontWeight: "900",
              color: "#8B0000",
              marginBottom: "8px",
              paddingBottom: "4px",
              borderBottom: "2px solid #B22222",
              letterSpacing: "1px",
            }}
          >
            ৩. চূড়ান্ত লেনদেন (কে কাকে কত দেবে)
          </div>
          {transactions.length === 0 ? (
            <div
              style={{
                background: "#E4F0E4",
                border: "1px solid #2B6A3F",
                padding: "10px",
                textAlign: "center",
                fontSize: "11px",
                color: "#2B6A3F",
                fontWeight: "bold",
                borderRadius: "4px",
              }}
            >
              ✓ সবার হিসাব ক্লিয়ার — কোনো লেনদেন বাকি নেই
            </div>
          ) : (
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "11px",
              }}
            >
              <thead>
                <tr style={{ background: "#EADBC8" }}>
                  <th
                    style={{
                      border: "1px solid #B22222",
                      padding: "6px 4px",
                      width: "30px",
                      color: "#8B0000",
                      fontWeight: "900",
                    }}
                  >
                    ক্রম
                  </th>
                  <th
                    style={{
                      border: "1px solid #B22222",
                      padding: "6px",
                      color: "#8B0000",
                      fontWeight: "900",
                    }}
                  >
                    কে দেবে
                  </th>
                  <th
                    style={{
                      border: "1px solid #B22222",
                      padding: "6px",
                      color: "#8B0000",
                      fontWeight: "900",
                    }}
                  >
                    কাকে
                  </th>
                  <th
                    style={{
                      border: "1px solid #B22222",
                      padding: "6px",
                      color: "#8B0000",
                      fontWeight: "900",
                    }}
                  >
                    টাকা
                  </th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx, i) => (
                  <tr
                    key={i}
                    style={{
                      background: i % 2 === 0 ? "#FBF3E4" : "#F5E6CE",
                    }}
                  >
                    <td
                      style={{
                        border: "1px solid #B22222",
                        padding: "6px 4px",
                        textAlign: "center",
                        fontWeight: "bold",
                      }}
                    >
                      {useBangla ? toBn(i + 1) : i + 1}
                    </td>
                    <td
                      style={{
                        border: "1px solid #B22222",
                        padding: "6px",
                        fontWeight: "bold",
                        color: tx.fromIsFund ? "#5C3317" : "#8B0000",
                      }}
                    >
                      {tx.from}
                    </td>
                    <td
                      style={{
                        border: "1px solid #B22222",
                        padding: "6px",
                        fontWeight: "bold",
                        color: tx.toIsFund ? "#5C3317" : "#2B6A3F",
                      }}
                    >
                      {tx.to}
                    </td>
                    <td
                      style={{
                        border: "1px solid #B22222",
                        padding: "6px",
                        textAlign: "right",
                        fontWeight: "900",
                        color: "#8B0000",
                      }}
                    >
                      ৳<SlipNum value={tx.amount} useBangla={useBangla} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div
          style={{
            marginTop: "24px",
            paddingTop: "12px",
            borderTop: "2px dotted #8B0000",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: "9px",
              color: "#8B0000",
              letterSpacing: "1.5px",
              fontWeight: "bold",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}
          >
            Powered by CUET Adventure Society
          </div>
          <div
            style={{
              fontSize: "8px",
              color: "#5C3317",
              fontStyle: "italic",
              letterSpacing: "0.5px",
              marginTop: "3px",
            }}
          >
            cuetas.com
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MEMBER SLIP
   ═══════════════════════════════════════════════════════════════ */
function MemberSlip({ slip, eventData, useBangla }) {
  const { member, balance, consumed, paid, myTx } = slip;
  const isRecv = balance.net > 0.01;
  const isPay = balance.net < -0.01;

  return (
    <div
      data-slip-page
      style={{
        width: "760px",
        background: "#FBF3E4",
        padding: "32px",
        fontFamily:
          "'Noto Serif Bengali', 'Kalpurush', 'SolaimanLipi', Georgia, serif",
        color: "#2B1810",
      }}
    >
      <div
        style={{
          border: "4px double #8B0000",
          padding: "28px 24px",
          background: "rgba(255, 253, 245, 0.6)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <div
            style={{
              fontSize: "28px",
              fontWeight: "900",
              color: "#8B0000",
              lineHeight: "1.25",
              wordBreak: "break-word",
              paddingBottom: "6px",
              borderBottom: "2px solid #8B0000",
              display: "inline-block",
              maxWidth: "100%",
            }}
          >
            {eventData.name || "Unnamed Event"}
          </div>
          <div
            style={{
              fontSize: "13px",
              fontWeight: "bold",
              color: "#5C3317",
              marginTop: "10px",
              letterSpacing: "0.5px",
            }}
          >
            ব্যক্তিগত হিসাব স্লিপ
          </div>
          <div
            style={{
              fontSize: "11px",
              color: "#8B0000",
              marginTop: "4px",
              fontWeight: "bold",
            }}
          >
            {eventData.date
              ? `তারিখ: ${eventData.date}`
              : `জেনারেটেড: ${new Date().toLocaleDateString("en-GB")}`}
          </div>
        </div>

        <div
          style={{
            background: "#F5E6CE",
            padding: "12px",
            border: "1px solid #B22222",
            borderRadius: "4px",
            marginBottom: "16px",
            fontSize: "12px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ color: "#8B0000", fontWeight: "bold" }}>সদস্য:</span>
            <span style={{ fontWeight: "900", fontSize: "15px" }}>
              {member.name}
            </span>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "8px",
            marginBottom: "18px",
            padding: "10px",
            background: "#F5E6CE",
            border: "1px solid #B22222",
            borderRadius: "4px",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: "10px",
                color: "#8B0000",
                fontWeight: "bold",
              }}
            >
              মোট জমা
            </div>
            <div
              style={{
                fontSize: "16px",
                fontWeight: "900",
                color: "#2B6A3F",
              }}
            >
              ৳<SlipNum value={balance.paid} useBangla={useBangla} />
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: "10px",
                color: "#8B0000",
                fontWeight: "bold",
              }}
            >
              মোট ভোগ
            </div>
            <div
              style={{
                fontSize: "16px",
                fontWeight: "900",
                color: "#8B0000",
              }}
            >
              ৳<SlipNum value={balance.consumed} useBangla={useBangla} />
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: "10px",
                color: "#8B0000",
                fontWeight: "bold",
              }}
            >
              চূড়ান্ত ব্যালান্স
            </div>
            <div
              style={{
                fontSize: "16px",
                fontWeight: "900",
                color: isRecv ? "#2B6A3F" : isPay ? "#8B0000" : "#5C3317",
              }}
            >
              {isRecv ? "+" : isPay ? "-" : ""}৳
              <SlipNum
                value={Math.abs(balance.net)}
                useBangla={useBangla}
              />
            </div>
          </div>
        </div>

        <div style={{ marginBottom: "16px" }}>
          <div
            style={{
              fontSize: "12px",
              fontWeight: "900",
              color: "#8B0000",
              marginBottom: "8px",
              paddingBottom: "4px",
              borderBottom: "2px solid #B22222",
            }}
          >
            ১. যে খরচে অংশ নিয়েছেন
          </div>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "11px",
            }}
          >
            <thead>
              <tr style={{ background: "#EADBC8" }}>
                <th
                  style={{
                    border: "1px solid #B22222",
                    padding: "6px 4px",
                    width: "30px",
                    color: "#8B0000",
                    fontWeight: "900",
                  }}
                >
                  ক্রম
                </th>
                <th
                  style={{
                    border: "1px solid #B22222",
                    padding: "6px",
                    textAlign: "left",
                    color: "#8B0000",
                    fontWeight: "900",
                  }}
                >
                  বিবরণ
                </th>
                <th
                  style={{
                    border: "1px solid #B22222",
                    padding: "6px",
                    color: "#8B0000",
                    fontWeight: "900",
                  }}
                >
                  মোট
                </th>
                <th
                  style={{
                    border: "1px solid #B22222",
                    padding: "6px",
                    color: "#8B0000",
                    fontWeight: "900",
                  }}
                >
                  জন
                </th>
                <th
                  style={{
                    border: "1px solid #B22222",
                    padding: "6px",
                    color: "#8B0000",
                    fontWeight: "900",
                  }}
                >
                  আপনার অংশ
                </th>
              </tr>
            </thead>
            <tbody>
              {consumed.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    style={{
                      border: "1px solid #B22222",
                      padding: "10px",
                      textAlign: "center",
                      fontStyle: "italic",
                      color: "#8B0000",
                    }}
                  >
                    কোনো খরচে অংশ নেননি
                  </td>
                </tr>
              )}
              {consumed.map((c, i) => (
                <tr
                  key={i}
                  style={{ background: i % 2 === 0 ? "#FBF3E4" : "#F5E6CE" }}
                >
                  <td
                    style={{
                      border: "1px solid #B22222",
                      padding: "6px 4px",
                      textAlign: "center",
                      fontWeight: "bold",
                    }}
                  >
                    {useBangla ? toBn(i + 1) : i + 1}
                  </td>
                  <td
                    style={{
                      border: "1px solid #B22222",
                      padding: "6px",
                      wordBreak: "break-word",
                    }}
                  >
                    {c.desc}
                    <span
                      style={{
                        fontSize: "9px",
                        color: "#8B0000",
                        marginLeft: "6px",
                      }}
                    >
                      ({c.paidBy})
                    </span>
                  </td>
                  <td
                    style={{
                      border: "1px solid #B22222",
                      padding: "6px",
                      textAlign: "right",
                      whiteSpace: "nowrap",
                    }}
                  >
                    ৳<SlipNum value={c.total} useBangla={useBangla} />
                  </td>
                  <td
                    style={{
                      border: "1px solid #B22222",
                      padding: "6px",
                      textAlign: "center",
                    }}
                  >
                    {useBangla ? toBn(c.consumers) : c.consumers}
                  </td>
                  <td
                    style={{
                      border: "1px solid #B22222",
                      padding: "6px",
                      textAlign: "right",
                      fontWeight: "900",
                      color: "#8B0000",
                      whiteSpace: "nowrap",
                    }}
                  >
                    ৳<SlipNum value={c.myShare} useBangla={useBangla} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginBottom: "16px" }}>
          <div
            style={{
              fontSize: "12px",
              fontWeight: "900",
              color: "#8B0000",
              marginBottom: "8px",
              paddingBottom: "4px",
              borderBottom: "2px solid #B22222",
            }}
          >
            ২. আপনার পরিশোধ
          </div>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "11px",
            }}
          >
            <thead>
              <tr style={{ background: "#EADBC8" }}>
                <th
                  style={{
                    border: "1px solid #B22222",
                    padding: "6px 4px",
                    width: "30px",
                    color: "#8B0000",
                    fontWeight: "900",
                  }}
                >
                  ক্রম
                </th>
                <th
                  style={{
                    border: "1px solid #B22222",
                    padding: "6px",
                    textAlign: "left",
                    color: "#8B0000",
                    fontWeight: "900",
                  }}
                >
                  বিবরণ
                </th>
                <th
                  style={{
                    border: "1px solid #B22222",
                    padding: "6px",
                    color: "#8B0000",
                    fontWeight: "900",
                  }}
                >
                  পরিমাণ
                </th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ background: "#FBF3E4" }}>
                <td
                  style={{
                    border: "1px solid #B22222",
                    padding: "6px 4px",
                    textAlign: "center",
                    fontWeight: "bold",
                  }}
                >
                  {useBangla ? toBn(1) : 1}
                </td>
                <td
                  style={{
                    border: "1px solid #B22222",
                    padding: "6px",
                    fontWeight: "bold",
                  }}
                >
                  গ্রুপ ফান্ডে জমা
                </td>
                <td
                  style={{
                    border: "1px solid #B22222",
                    padding: "6px",
                    textAlign: "right",
                    color: "#2B6A3F",
                    fontWeight: "900",
                  }}
                >
                  ৳<SlipNum value={balance.deposit} useBangla={useBangla} />
                </td>
              </tr>
              {paid.map((p, i) => (
                <tr
                  key={i}
                  style={{ background: i % 2 === 0 ? "#F5E6CE" : "#FBF3E4" }}
                >
                  <td
                    style={{
                      border: "1px solid #B22222",
                      padding: "6px 4px",
                      textAlign: "center",
                      fontWeight: "bold",
                    }}
                  >
                    {useBangla ? toBn(i + 2) : i + 2}
                  </td>
                  <td
                    style={{
                      border: "1px solid #B22222",
                      padding: "6px",
                      wordBreak: "break-word",
                    }}
                  >
                    নিজ পকেট থেকে: {p.desc}
                  </td>
                  <td
                    style={{
                      border: "1px solid #B22222",
                      padding: "6px",
                      textAlign: "right",
                      color: "#2B6A3F",
                      fontWeight: "900",
                    }}
                  >
                    ৳<SlipNum value={p.amount} useBangla={useBangla} />
                  </td>
                </tr>
              ))}
              <tr style={{ background: "#EADBC8", fontWeight: "900" }}>
                <td
                  colSpan={2}
                  style={{
                    border: "1px solid #B22222",
                    padding: "6px",
                    textAlign: "right",
                    color: "#8B0000",
                  }}
                >
                  মোট পরিশোধ:
                </td>
                <td
                  style={{
                    border: "1px solid #B22222",
                    padding: "6px",
                    textAlign: "right",
                    color: "#2B6A3F",
                    fontWeight: "900",
                  }}
                >
                  ৳<SlipNum value={balance.paid} useBangla={useBangla} />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={{ marginBottom: "16px" }}>
          <div
            style={{
              fontSize: "12px",
              fontWeight: "900",
              color: "#8B0000",
              marginBottom: "8px",
              paddingBottom: "4px",
              borderBottom: "2px solid #B22222",
            }}
          >
            ৩. আপনার চূড়ান্ত লেনদেন
          </div>
          {myTx.length === 0 ? (
            <div
              style={{
                background: "#E4F0E4",
                border: "1px solid #2B6A3F",
                padding: "10px",
                textAlign: "center",
                fontSize: "11px",
                color: "#2B6A3F",
                fontWeight: "bold",
                borderRadius: "4px",
              }}
            >
              ✓ আপনার হিসাব সম্পূর্ণ পরিষ্কার
            </div>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "6px" }}
            >
              {myTx.map((tx, i) => {
                const isFromMe = tx.from === member.name;
                return (
                  <div
                    key={i}
                    style={{
                      background: isFromMe ? "#FDE8E8" : "#E8F5E8",
                      border: `1px solid ${
                        isFromMe ? "#8B0000" : "#2B6A3F"
                      }`,
                      padding: "10px",
                      borderRadius: "4px",
                      fontSize: "12px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div style={{ fontWeight: "bold" }}>
                      {isFromMe ? (
                        <>
                          আপনি{" "}
                          <span style={{ color: "#8B0000" }}>{tx.to}</span> কে
                          দেবেন
                        </>
                      ) : (
                        <>
                          <span style={{ color: "#2B6A3F" }}>{tx.from}</span>{" "}
                          আপনাকে দেবেন
                        </>
                      )}
                    </div>
                    <div
                      style={{
                        fontWeight: "900",
                        color: isFromMe ? "#8B0000" : "#2B6A3F",
                        fontSize: "14px",
                      }}
                    >
                      ৳<SlipNum value={tx.amount} useBangla={useBangla} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div
          style={{
            background: isRecv ? "#E8F5E8" : isPay ? "#FDE8E8" : "#F5F5F5",
            border: `2px solid ${
              isRecv ? "#2B6A3F" : isPay ? "#8B0000" : "#888"
            }`,
            padding: "12px",
            borderRadius: "6px",
            textAlign: "center",
            marginBottom: "16px",
          }}
        >
          <div
            style={{
              fontSize: "11px",
              fontWeight: "bold",
              color: isRecv ? "#2B6A3F" : isPay ? "#8B0000" : "#666",
              letterSpacing: "1px",
            }}
          >
            {isRecv
              ? "আপনি ফেরত পাবেন"
              : isPay
              ? "আপনাকে আরও দিতে হবে"
              : "হিসাব ক্লিয়ার"}
          </div>
          <div
            style={{
              fontSize: "28px",
              fontWeight: "900",
              color: isRecv ? "#2B6A3F" : isPay ? "#8B0000" : "#666",
              marginTop: "4px",
            }}
          >
            ৳<SlipNum value={Math.abs(balance.net)} useBangla={useBangla} />
          </div>
        </div>

        <div
          style={{
            marginTop: "24px",
            paddingTop: "12px",
            borderTop: "2px dotted #8B0000",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: "9px",
              color: "#8B0000",
              letterSpacing: "1.5px",
              fontWeight: "bold",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}
          >
            Powered by CUET Adventure Society
          </div>
          <div
            style={{
              fontSize: "8px",
              color: "#5C3317",
              fontStyle: "italic",
              letterSpacing: "0.5px",
              marginTop: "3px",
            }}
          >
            cuetas.com
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export default function EventCalculator() {
  const [isMounted, setIsMounted] = useState(false);
  const slipRenderRef = useRef(null);
  const expenseFormRef = useRef(null);

  const [savedEvents, setSavedEvents] = useState([]);
  const [currentEventId, setCurrentEventId] = useState(null);

  const [eventData, setEventData] = useState({ name: "", date: "" });
  const [members, setMembers] = useState([]);
  const [expenses, setExpenses] = useState([]);

  const [activeTab, setActiveTab] = useState("setup");
  const [newMemberName, setNewMemberName] = useState("");
  const [editingExpenseId, setEditingExpenseId] = useState(null);

  const [fundWarning, setFundWarning] = useState(null);
  const [warningPayerId, setWarningPayerId] = useState("");

  const [slipMode, setSlipMode] = useState("none");
  const [slipMemberId, setSlipMemberId] = useState("");
  const [slipUseBanglaDigits, setSlipUseBanglaDigits] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const [expenseForm, setExpenseForm] = useState({
    desc: "",
    amount: "",
    paymentMethod: "group",
    singlePayerId: "",
    multiPayers: {},
    consumers: [],
  });

  /* ── Load & migrate ── */
  useEffect(() => {
    AOS.init({ duration: 600, once: true });

    try {
      const savedListRaw = localStorage.getItem("cas_event_calc_list");
      const savedActiveId = localStorage.getItem("cas_event_calc_active_id");
      const legacySingleRaw = localStorage.getItem("cas_event_calc");

      let list = savedListRaw ? JSON.parse(savedListRaw) : [];

      if (list.length === 0 && legacySingleRaw) {
        const legacy = JSON.parse(legacySingleRaw);
        if (legacy?.eventData?.name || legacy?.members?.length > 0) {
          const migratedId = "evt_" + Date.now().toString();
          const migratedEvent = {
            id: migratedId,
            eventData: legacy.eventData || { name: "Unnamed Event", date: "" },
            members: legacy.members || [],
            expenses: legacy.expenses || [],
            updatedAt: new Date().toISOString(),
          };
          list = [migratedEvent];
          localStorage.setItem("cas_event_calc_list", JSON.stringify(list));
          localStorage.setItem("cas_event_calc_active_id", migratedId);
        }
      }

      setSavedEvents(list);

      if (savedActiveId) {
        const activeEvt = list.find((e) => e.id === savedActiveId);
        if (activeEvt) {
          setCurrentEventId(activeEvt.id);
          setEventData(activeEvt.eventData || { name: "", date: "" });
          setMembers(activeEvt.members || []);
          setExpenses(activeEvt.expenses || []);
          if (activeEvt.eventData?.name) setActiveTab("members");
        }
      } else if (list.length > 0) {
        const latest = list[0];
        setCurrentEventId(latest.id);
        setEventData(latest.eventData || { name: "", date: "" });
        setMembers(latest.members || []);
        setExpenses(latest.expenses || []);
        if (latest.eventData?.name) setActiveTab("members");
      }
    } catch (err) {
      console.error("Failed to load event calculator storage:", err);
    }

    setIsMounted(true);
  }, []);

  /* ── Auto-sync ── */
  useEffect(() => {
    if (!isMounted || !currentEventId) return;

    setSavedEvents((prevList) => {
      const updatedEvent = {
        id: currentEventId,
        eventData,
        members,
        expenses,
        updatedAt: new Date().toISOString(),
      };

      const exists = prevList.some((e) => e.id === currentEventId);
      const nextList = exists
        ? prevList.map((e) => (e.id === currentEventId ? updatedEvent : e))
        : [updatedEvent, ...prevList];

      localStorage.setItem("cas_event_calc_list", JSON.stringify(nextList));
      localStorage.setItem("cas_event_calc_active_id", currentEventId);
      localStorage.setItem(
        "cas_event_calc",
        JSON.stringify({ eventData, members, expenses })
      );

      return nextList;
    });
  }, [eventData, members, expenses, currentEventId, isMounted]);

  /* ── Event session handlers ── */
  const handleStartEvent = (e) => {
    e.preventDefault();
    if (!eventData.name.trim()) return alert("ইভেন্টের নাম দিন!");

    if (!currentEventId) {
      const newId = "evt_" + Date.now().toString();
      setCurrentEventId(newId);
    }
    setActiveTab("members");
  };

  const handleLoadSavedEvent = (evt) => {
    setCurrentEventId(evt.id);
    setEventData(evt.eventData || { name: "", date: "" });
    setMembers(evt.members || []);
    setExpenses(evt.expenses || []);
    setEditingExpenseId(null);
    setSlipMode("none");
    localStorage.setItem("cas_event_calc_active_id", evt.id);
    setActiveTab("members");
  };

  const handleCreateNewEvent = () => {
    setCurrentEventId(null);
    setEventData({ name: "", date: "" });
    setMembers([]);
    setExpenses([]);
    setEditingExpenseId(null);
    setSlipMode("none");
    localStorage.removeItem("cas_event_calc_active_id");
    setActiveTab("setup");
  };

  const handleDeleteSavedEvent = (id, name) => {
    if (
      window.confirm(
        `"${name || "Unnamed Event"}" এর সম্পূর্ণ হিসাব মুছে ফেলতে চান? এটি আর ফিরিয়ে আনা যাবে না!`
      )
    ) {
      const updated = savedEvents.filter((e) => e.id !== id);
      setSavedEvents(updated);
      localStorage.setItem("cas_event_calc_list", JSON.stringify(updated));

      if (currentEventId === id) {
        handleCreateNewEvent();
      }
    }
  };

  /* ── Member handlers ── */
  const handleAddMember = (e) => {
    e.preventDefault();
    const trimmed = newMemberName.trim();
    if (!trimmed) return;

    if (members.some((m) => m.name.toLowerCase() === trimmed.toLowerCase())) {
      return alert(
        "এই নামের একজন মেম্বার ইতিমধ্যে যুক্ত আছেন! আলাদা নাম বা ডাকনাম ব্যবহার করুন।"
      );
    }

    const newMember = {
      id:
        "mem_" +
        Date.now().toString() +
        "_" +
        Math.random().toString(36).slice(2, 6),
      name: trimmed,
      deposit: 0,
    };

    setMembers([...members, newMember]);
    setNewMemberName("");

    if (!editingExpenseId) {
      setExpenseForm((prev) => ({
        ...prev,
        consumers: [...prev.consumers, newMember.id],
      }));
    }
  };

  const handleUpdateDeposit = (id, amount) => {
    const parsed = parseFloat(amount);
    const cleanDeposit = !isNaN(parsed) && parsed >= 0 ? round2(parsed) : 0;
    setMembers(
      members.map((m) => (m.id === id ? { ...m, deposit: cleanDeposit } : m))
    );
  };

  const handleRemoveMember = (id) => {
    const targetMember = members.find((m) => m.id === id);
    if (!targetMember) return;

    const soleConsumerExpenses = expenses.filter(
      (exp) => exp.consumers.length === 1 && exp.consumers[0] === id
    );
    if (soleConsumerExpenses.length > 0) {
      const names = soleConsumerExpenses.map((e) => `"${e.desc}"`).join(", ");
      return alert(
        `সতর্কতা: "${targetMember.name}" কে ডিলিট করা যাবে না!\n\nসে নিচের খরচগুলোর একমাত্র ভোগকারী: ${names}।`
      );
    }

    const payerExpenses = expenses.filter(
      (exp) =>
        (exp.paymentMethod === "single" && exp.singlePayerId === id) ||
        (exp.paymentMethod === "multiple" &&
          parseFloat(exp.multiPayers?.[id] || 0) > 0)
    );
    if (payerExpenses.length > 0) {
      const names = payerExpenses.map((e) => `"${e.desc}"`).join(", ");
      return alert(
        `সতর্কতা: "${targetMember.name}" নিজ পকেট থেকে নিচের খরচগুলো পরিশোধ করেছে: ${names}।`
      );
    }

    const confirmMsg =
      targetMember.deposit > 0
        ? `"${targetMember.name}" এর নামে ৳${formatMoney(
            targetMember.deposit
          )} ফান্ডে জমা আছে। রিমুভ করলে মোট ফান্ড কমে যাবে। তবুও?`
        : `"${targetMember.name}" কে রিমুভ করবেন?`;

    if (window.confirm(confirmMsg)) {
      setMembers(members.filter((m) => m.id !== id));
      setExpenses(
        expenses.map((exp) => ({
          ...exp,
          consumers: exp.consumers.filter((cId) => cId !== id),
        }))
      );
      setExpenseForm((prev) => ({
        ...prev,
        singlePayerId: prev.singlePayerId === id ? "" : prev.singlePayerId,
        consumers: prev.consumers.filter((cId) => cId !== id),
      }));
    }
  };

  /* ── Expense handlers ── */
  const resetExpenseForm = () => {
    setEditingExpenseId(null);
    setExpenseForm({
      desc: "",
      amount: "",
      paymentMethod: "group",
      singlePayerId: members[0]?.id || "",
      multiPayers: {},
      consumers: members.map((m) => m.id),
    });
  };

  const buildExpensePayload = () => {
    const amountNum = round2(parseFloat(expenseForm.amount));

    if (!expenseForm.desc.trim() || isNaN(amountNum) || amountNum <= 0) {
      alert("খরচের বিবরণ ও সঠিক টাকার পরিমাণ (০ এর বেশি) দিন!");
      return null;
    }
    if (expenseForm.consumers.length === 0) {
      alert("অন্তত একজনকে সিলেক্ট করুন যার জন্য খরচটি হয়েছে!");
      return null;
    }
    if (expenseForm.paymentMethod === "single" && !expenseForm.singlePayerId) {
      alert("কে টাকা দিয়েছে তা সিলেক্ট করুন!");
      return null;
    }

    let cleanedMultiPayers = {};
    if (expenseForm.paymentMethod === "multiple") {
      let sumOfMultiPayers = 0;
      for (const [mId, val] of Object.entries(expenseForm.multiPayers)) {
        const parsedVal = round2(parseFloat(val) || 0);
        if (parsedVal < 0) {
          alert("মেম্বারের প্রদত্ত টাকার পরিমাণ ঋণাত্মক হতে পারে না!");
          return null;
        }
        if (parsedVal > 0) {
          cleanedMultiPayers[mId] = parsedVal;
          sumOfMultiPayers = round2(sumOfMultiPayers + parsedVal);
        }
      }

      if (Math.abs(sumOfMultiPayers - amountNum) > EPSILON) {
        const diff = round2(amountNum - sumOfMultiPayers);
        alert(
          `হিসাব মিলছে না!\nমোট খরচ: ৳${formatMoney(
            amountNum
          )}\nমেম্বারদের দেওয়া: ৳${formatMoney(
            sumOfMultiPayers
          )}\nপার্থক্য: ৳${formatMoney(Math.abs(diff))} (${
            diff > 0 ? "কম" : "বেশি"
          })`
        );
        return null;
      }
    }

    return {
      id: editingExpenseId || "exp_" + Date.now().toString(),
      desc: expenseForm.desc.trim(),
      amount: amountNum,
      paymentMethod: expenseForm.paymentMethod,
      singlePayerId:
        expenseForm.paymentMethod === "single" ? expenseForm.singlePayerId : "",
      multiPayers:
        expenseForm.paymentMethod === "multiple" ? cleanedMultiPayers : {},
      consumers: expenseForm.consumers,
    };
  };

  const projectGroupFundBalance = (payload) => {
    const currentGroupTotal = round2(
      members.reduce((s, m) => s + (Number(m.deposit) || 0), 0)
    );

    let groupOutflow = 0;
    for (const exp of expenses) {
      if (editingExpenseId && exp.id === editingExpenseId) continue;
      if (exp.paymentMethod === "group") {
        groupOutflow = round2(groupOutflow + exp.amount);
      }
    }
    if (payload.paymentMethod === "group") {
      groupOutflow = round2(groupOutflow + payload.amount);
    }

    return round2(currentGroupTotal - groupOutflow);
  };

  /* ── Robust commit by id ── */
  const commitExpenseSafe = (payload) => {
    const exists = expenses.some((e) => e.id === payload.id);
    if (exists) {
      setExpenses(expenses.map((e) => (e.id === payload.id ? payload : e)));
    } else {
      setExpenses([payload, ...expenses]);
    }
  };

  const handleSaveExpense = (e) => {
    e.preventDefault();
    const payload = buildExpensePayload();
    if (!payload) return;

    if (payload.paymentMethod === "group") {
      const projected = projectGroupFundBalance(payload);
      if (projected < -EPSILON) {
        setFundWarning({
          shortage: round2(Math.abs(projected)),
          pendingExpense: payload,
        });
        setWarningPayerId("");
        return;
      }
    }

    commitExpenseSafe(payload);
    resetExpenseForm();
  };

  /* ── Fund warning actions ── */
  const handleWarningSaveAsPersonal = () => {
    if (!fundWarning?.pendingExpense || !warningPayerId) return;

    const pending = fundWarning.pendingExpense;
    const newPayload = {
      ...pending,
      paymentMethod: "single",
      singlePayerId: warningPayerId,
      multiPayers: {},
    };

    commitExpenseSafe(newPayload);
    setFundWarning(null);
    setWarningPayerId("");
    resetExpenseForm();
  };

  const handleWarningGoToMembers = () => {
    setFundWarning(null);
    setWarningPayerId("");
    setActiveTab("members");
  };

  const handleWarningCancel = () => {
    setFundWarning(null);
    setWarningPayerId("");
  };

  const handleEditExpense = (exp) => {
    setEditingExpenseId(exp.id);
    setExpenseForm({
      desc: exp.desc,
      amount: exp.amount.toString(),
      paymentMethod: exp.paymentMethod,
      singlePayerId: exp.singlePayerId || members[0]?.id || "",
      multiPayers: exp.multiPayers ? { ...exp.multiPayers } : {},
      consumers: [...exp.consumers],
    });
    if (expenseFormRef.current) {
      expenseFormRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  const handleRemoveExpense = (id) => {
    if (window.confirm("খরচটি ডিলিট করবেন?")) {
      setExpenses(expenses.filter((e) => e.id !== id));
      if (editingExpenseId === id) resetExpenseForm();
    }
  };

  /* ── Financial calculations ── */
  const totalCollected = useMemo(
    () => round2(members.reduce((sum, m) => sum + (Number(m.deposit) || 0), 0)),
    [members]
  );

  const totalExpense = useMemo(
    () => round2(expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0)),
    [expenses]
  );

  const groupExpensesTotal = useMemo(
    () =>
      round2(
        expenses
          .filter((e) => e.paymentMethod === "group")
          .reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
      ),
    [expenses]
  );

  const groupFundBalance = useMemo(
    () => round2(totalCollected - groupExpensesTotal),
    [totalCollected, groupExpensesTotal]
  );

  const orphanExpenses = useMemo(() => {
    const ids = new Set(members.map((m) => m.id));
    return expenses.filter(
      (exp) => exp.consumers.filter((c) => ids.has(c)).length === 0
    );
  }, [expenses, members]);

  const { settlementData, transactions } = useMemo(() => {
    const balances = {};
    members.forEach((m) => {
      balances[m.id] = {
        id: m.id,
        name: m.name,
        deposit: round2(m.deposit || 0),
        pocketPaid: 0,
        paid: round2(m.deposit || 0),
        consumed: 0,
        net: 0,
      };
    });

    expenses.forEach((exp) => {
      const validConsumers = exp.consumers.filter((cId) => balances[cId]);
      if (validConsumers.length === 0) return;

      const shares = splitAmount(exp.amount, validConsumers.length);
      validConsumers.forEach((cId, idx) => {
        balances[cId].consumed = round2(balances[cId].consumed + shares[idx]);
      });

      if (exp.paymentMethod === "single" && balances[exp.singlePayerId]) {
        balances[exp.singlePayerId].pocketPaid = round2(
          balances[exp.singlePayerId].pocketPaid + exp.amount
        );
        balances[exp.singlePayerId].paid = round2(
          balances[exp.singlePayerId].paid + exp.amount
        );
      } else if (exp.paymentMethod === "multiple" && exp.multiPayers) {
        Object.entries(exp.multiPayers).forEach(([pId, amtStr]) => {
          const amt = parseFloat(amtStr) || 0;
          if (balances[pId]) {
            balances[pId].pocketPaid = round2(balances[pId].pocketPaid + amt);
            balances[pId].paid = round2(balances[pId].paid + amt);
          }
        });
      }
    });

    Object.keys(balances).forEach((id) => {
      balances[id].pocketPaid = round2(balances[id].pocketPaid);
      balances[id].paid = round2(balances[id].paid);
      balances[id].consumed = round2(balances[id].consumed);
      balances[id].net = round2(balances[id].paid - balances[id].consumed);
    });

    const payers = [];
    const receivers = [];

    Object.values(balances).forEach((b) => {
      if (b.net < -EPSILON) {
        payers.push({
          id: b.id,
          name: b.name,
          amount: round2(Math.abs(b.net)),
          isFund: false,
        });
      } else if (b.net > EPSILON) {
        receivers.push({
          id: b.id,
          name: b.name,
          amount: round2(b.net),
          isFund: false,
        });
      }
    });

    if (groupFundBalance > EPSILON) {
      payers.push({
        id: "GROUP_FUND",
        name: "গ্রুপ ফান্ড (ক্যাশ ব্যালেন্স)",
        amount: round2(groupFundBalance),
        isFund: true,
      });
    } else if (groupFundBalance < -EPSILON) {
      receivers.push({
        id: "GROUP_FUND",
        name: "গ্রুপ ফান্ড (ক্যাশ ঘাটতি)",
        amount: round2(Math.abs(groupFundBalance)),
        isFund: true,
      });
    }

    const settlementTx = [];
    let safetyCounter = 0;

    while (payers.length > 0 && receivers.length > 0 && safetyCounter < 1000) {
      safetyCounter++;
      payers.sort((a, b) => b.amount - a.amount);
      receivers.sort((a, b) => b.amount - a.amount);

      const payer = payers[0];
      const receiver = receivers[0];
      const settledAmount = round2(Math.min(payer.amount, receiver.amount));

      if (settledAmount > EPSILON) {
        settlementTx.push({
          from: payer.name,
          to: receiver.name,
          fromIsFund: payer.isFund,
          toIsFund: receiver.isFund,
          amount: settledAmount,
        });
      }

      payer.amount = round2(payer.amount - settledAmount);
      receiver.amount = round2(receiver.amount - settledAmount);

      if (payer.amount <= EPSILON) payers.shift();
      if (receiver.amount <= EPSILON) receivers.shift();
    }

    return { settlementData: balances, transactions: settlementTx };
  }, [members, expenses, groupFundBalance]);

  const memberSlips = useMemo(() => {
    return members
      .map((m) => {
        const bal = settlementData[m.id];
        if (!bal) return null;

        const consumed = expenses
          .filter((exp) => exp.consumers.includes(m.id))
          .map((exp) => {
            const validConsumers = exp.consumers.filter((c) =>
              settlementData[c]
            );
            const shares = splitAmount(exp.amount, validConsumers.length);
            const idx = validConsumers.indexOf(m.id);
            const share = idx >= 0 ? shares[idx] : 0;
            let paidBy = "গ্রুপ ফান্ড";
            if (exp.paymentMethod === "single") {
              paidBy =
                members.find((mm) => mm.id === exp.singlePayerId)?.name ||
                "Unknown";
            } else if (exp.paymentMethod === "multiple") {
              paidBy = "একাধিক মেম্বার";
            }
            return {
              desc: exp.desc,
              total: exp.amount,
              consumers: validConsumers.length,
              myShare: share,
              paidBy,
            };
          });

        const paid = expenses
          .filter((exp) => {
            if (exp.paymentMethod === "single")
              return exp.singlePayerId === m.id;
            if (exp.paymentMethod === "multiple")
              return parseFloat(exp.multiPayers?.[m.id] || 0) > 0;
            return false;
          })
          .map((exp) => ({
            desc: exp.desc,
            amount:
              exp.paymentMethod === "single"
                ? exp.amount
                : parseFloat(exp.multiPayers[m.id]),
          }));

        const myTx = transactions.filter(
          (tx) => tx.from === m.name || tx.to === m.name
        );

        return { member: m, balance: bal, consumed, paid, myTx };
      })
      .filter(Boolean);
  }, [members, expenses, settlementData, transactions]);

  const currentMultiPayerSum = useMemo(() => {
    if (expenseForm.paymentMethod !== "multiple") return 0;
    return round2(
      Object.values(expenseForm.multiPayers).reduce(
        (sum, val) => sum + (parseFloat(val) || 0),
        0
      )
    );
  }, [expenseForm.multiPayers, expenseForm.paymentMethod]);

  /* ── Download handlers ── */
  const renderSlipToCanvas = async (slipElement) => {
    const html2canvas = (await import("html2canvas")).default;
    return await html2canvas(slipElement, {
      scale: 2.5,
      backgroundColor: "#FBF3E4",
      useCORS: true,
      logging: false,
    });
  };

  const downloadPNG = async () => {
    setIsGenerating(true);
    try {
      const container = slipRenderRef.current;
      if (!container) throw new Error("No slip rendered");

      const firstSlip = container.querySelector("[data-slip-page]");
      if (!firstSlip) throw new Error("No slip found");

      const canvas = await renderSlipToCanvas(firstSlip);
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      const safeName = (eventData.name || "Event").replace(/\s+/g, "-");
      const suffix =
        slipMode === "summary"
          ? "Summary"
          : slipMode === "member"
          ? `-${members.find((m) => m.id === slipMemberId)?.name || "Member"}`
          : "Slip";
      link.download = `CAS-${safeName}${suffix}.png`;
      link.click();
    } catch (err) {
      alert("স্লিপ তৈরি করতে সমস্যা হয়েছে!");
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadPDF = async () => {
    setIsGenerating(true);
    try {
      const container = slipRenderRef.current;
      if (!container) throw new Error("No slip rendered");

      const slips = container.querySelectorAll("[data-slip-page]");
      if (slips.length === 0) throw new Error("No slips found");

      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageW = 210;
      const pageH = 297;
      const margin = 8;
      const usableW = pageW - margin * 2;
      const usableH = pageH - margin * 2;

      let firstPage = true;

      for (const slip of slips) {
        const canvas = await renderSlipToCanvas(slip);
        const imgW = usableW;
        const imgH = (canvas.height * imgW) / canvas.width;

        if (imgH <= usableH) {
          if (!firstPage) pdf.addPage();
          pdf.addImage(
            canvas.toDataURL("image/jpeg", 0.95),
            "JPEG",
            margin,
            margin,
            imgW,
            imgH
          );
          firstPage = false;
        } else {
          const pagesNeeded = Math.ceil(imgH / usableH);
          const pxPerSlice = Math.ceil(canvas.height / pagesNeeded);

          for (let i = 0; i < pagesNeeded; i++) {
            const sliceCanvas = document.createElement("canvas");
            sliceCanvas.width = canvas.width;
            sliceCanvas.height = Math.min(
              pxPerSlice,
              canvas.height - i * pxPerSlice
            );
            const ctx = sliceCanvas.getContext("2d");
            ctx.drawImage(
              canvas,
              0,
              i * pxPerSlice,
              canvas.width,
              sliceCanvas.height,
              0,
              0,
              canvas.width,
              sliceCanvas.height
            );

            if (!firstPage) pdf.addPage();
            const sliceH = (sliceCanvas.height * imgW) / canvas.width;
            pdf.addImage(
              sliceCanvas.toDataURL("image/jpeg", 0.95),
              "JPEG",
              margin,
              margin,
              imgW,
              sliceH
            );
            firstPage = false;
          }
        }
      }

      const safeName = (eventData.name || "Event").replace(/\s+/g, "-");
      const suffix =
        slipMode === "summary"
          ? "Summary"
          : slipMode === "member"
          ? `-${members.find((m) => m.id === slipMemberId)?.name || "Member"}`
          : "Slips";
      pdf.save(`CAS-${safeName}${suffix}.pdf`);
    } catch (err) {
      alert("PDF তৈরি করতে সমস্যা হয়েছে!");
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isMounted) return null;

  const slipsToRender =
    slipMode === "member"
      ? memberSlips.filter((s) => s.member.id === slipMemberId)
      : [];

  /* ═══════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-pastel-bg dark:bg-[#050b08] pt-24 pb-16 px-4 sm:px-6 relative text-gray-800 dark:text-gray-200 overflow-x-hidden transition-colors duration-500">
      <div
        ref={slipRenderRef}
        aria-hidden
        style={{
          position: "fixed",
          left: "-99999px",
          top: 0,
          width: "760px",
          pointerEvents: "none",
          opacity: 0,
        }}
      >
        {slipMode === "summary" && (
          <SummarySlip
            eventData={eventData}
            members={members}
            expenses={expenses}
            settlementData={settlementData}
            transactions={transactions}
            totalCollected={totalCollected}
            totalExpense={totalExpense}
            groupFundBalance={groupFundBalance}
            useBangla={slipUseBanglaDigits}
          />
        )}
        {slipMode === "member" && slipsToRender.length > 0 && (
          <MemberSlip
            slip={slipsToRender[0]}
            eventData={eventData}
            useBangla={slipUseBanglaDigits}
          />
        )}
        {slipMode === "all" &&
          memberSlips.map((slip) => (
            <MemberSlip
              key={slip.member.id}
              slip={slip}
              eventData={eventData}
              useBangla={slipUseBanglaDigits}
            />
          ))}
      </div>

      <div className="max-w-4xl mx-auto space-y-6 relative z-10">
        <div className="text-center mb-6" data-aos="fade-down">
          <h1 className="text-3xl sm:text-5xl font-black text-gray-900 dark:text-white mb-2 tracking-tight transition-colors">
            ইভেন্ট{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-500">
              ক্যালকুলেটর
            </span>
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-300 transition-colors">
            ট্যুরের যাবতীয় হিসাব-নিকাশের ম্যাজিক সমাধান
          </p>
        </div>

        {activeTab !== "setup" && (
          <div className="bg-white/80 dark:bg-white/5 border border-gray-200 dark:border-white/10 px-4 py-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-sm dark:shadow-none transition-colors">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <div>
                <p className="text-xs font-black text-gray-900 dark:text-white">
                  {eventData.name || "Unnamed Event"}
                </p>
                {eventData.date && (
                  <p className="text-[10px] text-gray-600 dark:text-gray-300">
                    তারিখ: {eventData.date}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab("setup")}
                className="text-xs font-bold px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-200 hover:bg-purple-100 dark:hover:bg-purple-500/20 hover:text-purple-600 dark:hover:text-purple-300 transition-colors"
              >
                <i className="fa-solid fa-folder-open mr-1.5"></i>ইভেন্ট
                পরিবর্তন ({savedEvents.length})
              </button>
              <button
                onClick={handleCreateNewEvent}
                className="text-xs font-bold px-3 py-1.5 rounded-lg bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-500/30 transition-colors"
              >
                <i className="fa-solid fa-plus mr-1"></i>নতুন
              </button>
            </div>
          </div>
        )}

        {activeTab !== "setup" && (
          <div className="flex flex-wrap justify-center gap-2 bg-white dark:bg-white/5 p-2 rounded-2xl mb-6 border border-gray-200 dark:border-white/10 shadow-soft dark:shadow-none transition-colors duration-500">
            <button
              onClick={() => setActiveTab("members")}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm dark:shadow-none ${
                activeTab === "members"
                  ? "bg-purple-500 text-white"
                  : "bg-gray-50 text-gray-700 dark:bg-transparent dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10"
              }`}
            >
              <i className="fa-solid fa-users mr-2"></i>মেম্বার ও ফান্ড
            </button>
            <button
              onClick={() => {
                setActiveTab("expenses");
                if (!editingExpenseId && expenseForm.consumers.length === 0) {
                  setExpenseForm((p) => ({
                    ...p,
                    singlePayerId: p.singlePayerId || members[0]?.id || "",
                    consumers: members.map((m) => m.id),
                  }));
                }
              }}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm dark:shadow-none ${
                activeTab === "expenses"
                  ? "bg-pink-500 text-white"
                  : "bg-gray-50 text-gray-700 dark:bg-transparent dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10"
              }`}
            >
              <i className="fa-solid fa-money-bill-wave mr-2"></i>খরচের খাতা
            </button>
            <button
              onClick={() => setActiveTab("settlement")}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm dark:shadow-none ${
                activeTab === "settlement"
                  ? "bg-emerald-500 text-white"
                  : "bg-gray-50 text-gray-700 dark:bg-transparent dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10"
              }`}
            >
              <i className="fa-solid fa-check-double mr-2"></i>সেটেলমেন্ট
            </button>
            <button
              onClick={() => setActiveTab("slips")}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm dark:shadow-none ${
                activeTab === "slips"
                  ? "bg-amber-500 text-white"
                  : "bg-gray-50 text-gray-700 dark:bg-transparent dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10"
              }`}
            >
              <i className="fa-solid fa-scroll mr-2"></i>স্লিপ
            </button>
          </div>
        )}

        {/* ═══ TAB 1: SETUP ═══ */}
        {activeTab === "setup" && (
          <div className="space-y-8" data-aos="zoom-in">
            <div className="bg-white dark:bg-[#0a1c13] border border-gray-200 dark:border-white/10 rounded-3xl p-8 max-w-md mx-auto shadow-soft dark:shadow-2xl transition-colors duration-500">
              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-purple-200 dark:border-purple-500/40 text-purple-600 dark:text-purple-400 text-2xl transition-colors">
                <i className="fa-solid fa-compass"></i>
              </div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white text-center mb-6 transition-colors">
                {currentEventId
                  ? "ইভেন্টের তথ্য আপডেট করুন"
                  : "নতুন ইভেন্ট শুরু করুন"}
              </h2>
              <form onSubmit={handleStartEvent} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1 transition-colors">
                    ইভেন্টের নাম *
                  </label>
                  <input
                    required
                    type="text"
                    value={eventData.name}
                    onChange={(e) =>
                      setEventData({ ...eventData, name: e.target.value })
                    }
                    placeholder="e.g. Sajek Tour 2026"
                    className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:border-purple-500 outline-none transition-colors shadow-sm dark:shadow-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1 transition-colors">
                    তারিখ
                  </label>
                  <input
                    type="date"
                    value={eventData.date}
                    onChange={(e) =>
                      setEventData({ ...eventData, date: e.target.value })
                    }
                    className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:border-purple-500 outline-none dark:[color-scheme:dark] transition-colors shadow-sm dark:shadow-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white py-3.5 rounded-xl font-black tracking-widest mt-4 transition-colors shadow-md hover:-translate-y-1"
                >
                  {currentEventId ? "হিসাবে ফিরে যান" : "হিসাব শুরু করুন"}{" "}
                  <i className="fa-solid fa-arrow-right ml-2"></i>
                </button>
              </form>
            </div>

            {savedEvents.length > 0 && (
              <div className="bg-white dark:bg-[#0a1c13] border border-gray-200 dark:border-white/10 rounded-3xl p-6 max-w-2xl mx-auto shadow-soft dark:shadow-xl transition-colors">
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/10 pb-3 mb-4">
                  <h3 className="text-sm font-black text-gray-800 dark:text-white uppercase tracking-wider">
                    <i className="fa-solid fa-clock-rotate-left mr-2 text-purple-500"></i>
                    সংরক্ষিত ইভেন্ট ({savedEvents.length})
                  </h3>
                </div>
                <div className="space-y-2.5">
                  {savedEvents.map((evt) => {
                    const isCurrent = evt.id === currentEventId;
                    const evtTotalExp = round2(
                      (evt.expenses || []).reduce(
                        (s, x) => s + (Number(x.amount) || 0),
                        0
                      )
                    );
                    return (
                      <div
                        key={evt.id}
                        className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                          isCurrent
                            ? "bg-purple-50/70 dark:bg-purple-500/10 border-purple-300 dark:border-purple-500/40"
                            : "bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10"
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-gray-900 dark:text-white text-sm">
                              {evt.eventData?.name || "Unnamed Event"}
                            </p>
                            {isCurrent && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-600 text-white font-bold">
                                Active
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-gray-600 dark:text-gray-300 mt-0.5">
                            মেম্বার: {evt.members?.length || 0} জন • মোট খরচ: ৳
                            {formatMoney(evtTotalExp)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <button
                            onClick={() => handleLoadSavedEvent(evt)}
                            className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-colors"
                          >
                            ওপেন
                          </button>
                          <button
                            onClick={() =>
                              handleDeleteSavedEvent(
                                evt.id,
                                evt.eventData?.name
                              )
                            }
                            className="p-2 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 border border-red-200 dark:border-transparent transition-colors"
                          >
                            <i className="fa-solid fa-trash text-xs"></i>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ TAB 2: MEMBERS ═══ */}
        {activeTab === "members" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-emerald-50 dark:bg-gradient-to-br dark:from-emerald-900/40 dark:to-emerald-900/10 border border-emerald-200 dark:border-emerald-500/30 p-5 rounded-2xl text-center transition-colors">
                <p className="text-xs text-emerald-700 dark:text-emerald-300 font-bold mb-1">
                  মোট ফান্ড কালেকশন
                </p>
                <p className="text-3xl font-black text-emerald-900 dark:text-white">
                  ৳{formatMoney(totalCollected)}
                </p>
              </div>
              <div className="bg-purple-50 dark:bg-gradient-to-br dark:from-purple-900/40 dark:to-purple-900/10 border border-purple-200 dark:border-purple-500/30 p-5 rounded-2xl text-center transition-colors">
                <p className="text-xs text-purple-700 dark:text-purple-300 font-bold mb-1">
                  মেম্বার সংখ্যা
                </p>
                <p className="text-3xl font-black text-purple-900 dark:text-white">
                  {members.length} জন
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-[#0a1c13] border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-soft dark:shadow-xl transition-colors">
              <h3 className="text-lg font-black text-gray-900 dark:text-white mb-4 border-b border-gray-100 dark:border-white/5 pb-3">
                মেম্বার ও ফান্ড জমা
              </h3>
              <form onSubmit={handleAddMember} className="flex gap-2 mb-6">
                <input
                  type="text"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  placeholder="মেম্বারের নাম লিখুন..."
                  className="flex-1 bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:border-purple-500 outline-none transition-colors shadow-sm dark:shadow-none"
                />
                <button
                  type="submit"
                  className="bg-purple-600 hover:bg-purple-500 text-white px-6 rounded-xl font-bold transition-colors shadow-md hover:-translate-y-0.5"
                >
                  <i className="fa-solid fa-plus"></i>
                </button>
              </form>

              <div className="space-y-3">
                {members.length === 0 && (
                  <p className="text-center text-gray-600 dark:text-gray-300 py-4 text-sm">
                    কোনো মেম্বার যুক্ত করা হয়নি।
                  </p>
                )}
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors shadow-sm dark:shadow-none"
                  >
                    <span className="font-bold text-gray-800 dark:text-white pl-2">
                      {member.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-gray-600 dark:text-gray-300 font-semibold mr-1">
                        ফান্ডে জমা:
                      </span>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-gray-500 dark:text-gray-400">
                          ৳
                        </span>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={member.deposit || ""}
                          onChange={(e) =>
                            handleUpdateDeposit(member.id, e.target.value)
                          }
                          placeholder="0"
                          className="w-32 bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-lg pl-7 pr-3 py-2 text-emerald-600 dark:text-emerald-400 font-bold focus:border-emerald-500 outline-none transition-colors shadow-inner dark:shadow-none"
                        />
                      </div>
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        className="bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/30 p-2 rounded-lg transition-colors border border-red-200 dark:border-transparent"
                      >
                        <i className="fa-solid fa-trash"></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══ TAB 3: EXPENSES ═══ */}
        {activeTab === "expenses" && (
          <div className="space-y-6">
            <div className="bg-pink-50 dark:bg-gradient-to-br dark:from-pink-900/40 dark:to-pink-900/10 border border-pink-200 dark:border-pink-500/30 p-5 rounded-2xl flex flex-wrap justify-between items-center gap-4 transition-colors">
              <div>
                <p className="text-xs text-pink-700 dark:text-pink-300 font-bold mb-1">
                  মোট খরচ
                </p>
                <p className="text-3xl font-black text-pink-900 dark:text-white text-left">
                  ৳{formatMoney(totalExpense)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-700 dark:text-gray-300 font-bold mb-1">
                  গ্রুপ ফান্ডের ক্যাশ
                </p>
                <p
                  className={`text-xl font-black ${
                    groupFundBalance < -EPSILON
                      ? "text-red-500"
                      : "text-emerald-600 dark:text-emerald-400"
                  }`}
                >
                  ৳{formatMoney(groupFundBalance)}
                </p>
              </div>
            </div>

            {orphanExpenses.length > 0 && (
              <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-2xl p-4">
                <p className="text-xs font-bold text-red-700 dark:text-red-300">
                  <i className="fa-solid fa-triangle-exclamation mr-1.5"></i>
                  {orphanExpenses.length}টি খরচের হিসাব মেলানো যাচ্ছে না
                  (ভোগকারী রিমুভ হয়ে গেছে):{" "}
                  {orphanExpenses.map((e) => `"${e.desc}"`).join(", ")}। এগুলো
                  এডিট বা ডিলিট করুন।
                </p>
              </div>
            )}

            <div
              ref={expenseFormRef}
              className="bg-white dark:bg-[#0a1c13] border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-soft dark:shadow-xl transition-colors"
            >
              <div className="flex items-center justify-between mb-4 border-b border-gray-100 dark:border-white/5 pb-3">
                <h3 className="text-lg font-black text-gray-900 dark:text-white">
                  {editingExpenseId ? (
                    <span className="text-amber-500">
                      <i className="fa-solid fa-pen-to-square mr-2"></i>খরচ
                      এডিট করুন
                    </span>
                  ) : (
                    "খরচের এন্ট্রি করুন"
                  )}
                </h3>
                {editingExpenseId && (
                  <button
                    type="button"
                    onClick={resetExpenseForm}
                    className="text-xs font-bold px-3 py-1 rounded-lg bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-200 hover:bg-red-100 dark:hover:bg-red-500/20 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                  >
                    <i className="fa-solid fa-xmark mr-1"></i>বাতিল
                  </button>
                )}
              </div>

              {members.length === 0 ? (
                <div className="text-center py-6 bg-amber-50 dark:bg-amber-500/10 rounded-2xl border border-amber-200 dark:border-amber-500/20">
                  <p className="text-sm font-bold text-amber-800 dark:text-amber-300 mb-2">
                    খরচ যুক্ত করার আগে অন্তত একজন মেম্বার যুক্ত করুন!
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab("members")}
                    className="px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold"
                  >
                    মেম্বার ট্যাবে যান
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={handleSaveExpense}
                  className={`space-y-4 mb-8 p-5 rounded-2xl border transition-colors ${
                    editingExpenseId
                      ? "bg-amber-50/40 dark:bg-amber-900/10 border-amber-300 dark:border-amber-500/40"
                      : "bg-gray-50 dark:bg-black/30 border-gray-200 dark:border-white/5"
                  }`}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                        কীসে খরচ হলো? *
                      </label>
                      <input
                        type="text"
                        value={expenseForm.desc}
                        onChange={(e) =>
                          setExpenseForm({
                            ...expenseForm,
                            desc: e.target.value,
                          })
                        }
                        placeholder="যেমন: বাসের ভাড়া"
                        className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white focus:border-pink-500 outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                        টাকার পরিমাণ (৳) *
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={expenseForm.amount}
                        onChange={(e) =>
                          setExpenseForm({
                            ...expenseForm,
                            amount: e.target.value,
                          })
                        }
                        placeholder="0"
                        className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white focus:border-pink-500 outline-none font-bold transition-colors"
                      />
                    </div>
                  </div>

                  <div className="bg-white dark:bg-white/5 p-4 rounded-xl border border-gray-200 dark:border-white/10 transition-colors">
                    <label className="block text-xs font-bold text-pink-600 dark:text-pink-400 mb-3 uppercase tracking-widest">
                      <i className="fa-solid fa-wallet mr-1"></i> টাকাটা কে
                      দিয়েছে?
                    </label>
                    <div className="flex gap-2 flex-wrap mb-4">
                      {[
                        { val: "group", label: "গ্রুপ ফান্ড" },
                        { val: "single", label: "একজন মেম্বার" },
                        { val: "multiple", label: "একাধিক মেম্বার" },
                      ].map((opt) => (
                        <label
                          key={opt.val}
                          className={`cursor-pointer px-4 py-2 rounded-lg text-xs font-bold border transition-all ${
                            expenseForm.paymentMethod === opt.val
                              ? "bg-pink-100 dark:bg-pink-500/20 border-pink-300 dark:border-pink-500 text-pink-700 dark:text-pink-300"
                              : "bg-gray-50 dark:bg-black/50 border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300"
                          }`}
                        >
                          <input
                            type="radio"
                            name="payMethod"
                            className="hidden"
                            checked={expenseForm.paymentMethod === opt.val}
                            onChange={() =>
                              setExpenseForm((prev) => ({
                                ...prev,
                                paymentMethod: opt.val,
                                singlePayerId:
                                  opt.val === "single"
                                    ? prev.singlePayerId || members[0]?.id || ""
                                    : prev.singlePayerId,
                              }))
                            }
                          />
                          {opt.label}
                        </label>
                      ))}
                    </div>

                    {expenseForm.paymentMethod === "single" && (
                      <select
                        value={expenseForm.singlePayerId}
                        onChange={(e) =>
                          setExpenseForm({
                            ...expenseForm,
                            singlePayerId: e.target.value,
                          })
                        }
                        className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-gray-800 dark:text-white focus:border-pink-500 outline-none mt-2 transition-colors"
                      >
                        <option value="">-- মেম্বার সিলেক্ট --</option>
                        {members.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    )}

                    {expenseForm.paymentMethod === "multiple" && (
                      <div className="space-y-3 mt-3">
                        <div className="flex justify-between items-center text-xs bg-gray-100 dark:bg-black/40 px-3 py-2 rounded-lg">
                          <span className="text-gray-700 dark:text-gray-300 font-bold">
                            যোগফল:
                          </span>
                          <span
                            className={`font-black ${
                              Math.abs(
                                currentMultiPayerSum -
                                  (parseFloat(expenseForm.amount) || 0)
                              ) <= EPSILON
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-amber-600 dark:text-amber-400"
                            }`}
                          >
                            ৳{formatMoney(currentMultiPayerSum)} / ৳
                            {formatMoney(parseFloat(expenseForm.amount) || 0)}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {members.map((m) => (
                            <div
                              key={m.id}
                              className="bg-gray-50 dark:bg-black/40 p-2 rounded-lg border border-gray-200 dark:border-white/5"
                            >
                              <span className="block text-[10px] text-gray-700 dark:text-gray-300 mb-1 truncate">
                                {m.name}
                              </span>
                              <input
                                type="number"
                                step="any"
                                min="0"
                                placeholder="৳ 0"
                                value={expenseForm.multiPayers[m.id] ?? ""}
                                onChange={(e) =>
                                  setExpenseForm({
                                    ...expenseForm,
                                    multiPayers: {
                                      ...expenseForm.multiPayers,
                                      [m.id]: e.target.value,
                                    },
                                  })
                                }
                                className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded px-2 py-1 text-xs text-gray-800 dark:text-white focus:border-pink-500 outline-none"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                        কাদের জন্য প্রযোজ্য? ({expenseForm.consumers.length}/
                        {members.length})
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setExpenseForm({
                            ...expenseForm,
                            consumers:
                              expenseForm.consumers.length === members.length
                                ? []
                                : members.map((m) => m.id),
                          })
                        }
                        className="text-[10px] text-pink-700 dark:text-pink-300 font-bold bg-pink-50 dark:bg-pink-500/10 border border-pink-200 dark:border-transparent px-2 py-1 rounded"
                      >
                        {expenseForm.consumers.length === members.length
                          ? "সবাইকে বাদ দিন"
                          : "সবাইকে নিন"}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {members.map((m) => {
                        const isSelected = expenseForm.consumers.includes(m.id);
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              const newConsumers = isSelected
                                ? expenseForm.consumers.filter(
                                    (id) => id !== m.id
                                  )
                                : [...expenseForm.consumers, m.id];
                              setExpenseForm({
                                ...expenseForm,
                                consumers: newConsumers,
                              });
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                              isSelected
                                ? "bg-pink-100 dark:bg-pink-500/20 border-pink-400 dark:border-pink-500 text-pink-700 dark:text-pink-300"
                                : "bg-gray-50 dark:bg-black/50 border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300"
                            }`}
                          >
                            {m.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    type="submit"
                    className={`w-full text-white py-3.5 rounded-xl font-bold uppercase tracking-widest transition-all mt-4 shadow-md hover:-translate-y-0.5 ${
                      editingExpenseId
                        ? "bg-amber-600 hover:bg-amber-500"
                        : "bg-pink-600 hover:bg-pink-500"
                    }`}
                  >
                    <i
                      className={`fa-solid ${
                        editingExpenseId ? "fa-floppy-disk" : "fa-check"
                      } mr-2`}
                    ></i>
                    {editingExpenseId ? "আপডেট করুন" : "খরচ যুক্ত করুন"}
                  </button>
                </form>
              )}

              <div className="space-y-3">
                {expenses.length === 0 && (
                  <p className="text-center text-gray-600 dark:text-gray-300 py-4 text-sm">
                    কোনো খরচ নেই।
                  </p>
                )}
                {expenses.map((exp, i) => {
                  let payerName = "";
                  if (exp.paymentMethod === "group") payerName = "গ্রুপ ফান্ড";
                  else if (exp.paymentMethod === "single")
                    payerName =
                      members.find((m) => m.id === exp.singlePayerId)?.name ||
                      "Unknown";
                  else payerName = "একাধিক";

                  const isBeingEdited = editingExpenseId === exp.id;
                  const perPersonShare =
                    exp.consumers.length > 0
                      ? formatMoney(exp.amount / exp.consumers.length)
                      : "0";

                  return (
                    <div
                      key={exp.id}
                      className={`border p-4 rounded-xl flex justify-between items-center gap-3 transition-colors relative ${
                        isBeingEdited
                          ? "bg-amber-50/60 dark:bg-amber-500/10 border-amber-400"
                          : "bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10"
                      }`}
                    >
                      <div className="pl-2">
                        <p className="font-bold text-gray-800 dark:text-white flex items-center gap-2 text-sm">
                          <span className="bg-white dark:bg-white/10 border border-gray-200 dark:border-transparent text-[10px] px-2 py-0.5 rounded-md text-gray-700 dark:text-gray-200">
                            {expenses.length - i}
                          </span>{" "}
                          {exp.desc}
                        </p>
                        <p className="text-[10px] text-gray-600 dark:text-gray-300 mt-1">
                          পেমেন্ট:{" "}
                          <span className="text-blue-500 dark:text-blue-300 font-bold">
                            {payerName}
                          </span>{" "}
                          • ভোগকারী:{" "}
                          {exp.consumers.length === members.length
                            ? "সকলে"
                            : `${exp.consumers.length} জন`}{" "}
                          (জনপ্রতি ~৳{perPersonShare})
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-base font-black text-pink-500 dark:text-pink-400">
                          ৳{formatMoney(exp.amount)}
                        </p>
                        <div className="flex items-center justify-end gap-3 mt-1">
                          <button
                            onClick={() => handleEditExpense(exp)}
                            className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase"
                          >
                            <i className="fa-solid fa-pen mr-1"></i>এডিট
                          </button>
                          <button
                            onClick={() => handleRemoveExpense(exp.id)}
                            className="text-[10px] text-red-500 dark:text-red-400 font-bold uppercase"
                          >
                            <i className="fa-solid fa-trash mr-1"></i>ডিলিট
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ═══ TAB 4: SETTLEMENT ═══ */}
        {activeTab === "settlement" && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-[#0a1c13] border border-gray-200 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-soft dark:shadow-xl transition-colors">
              <div className="text-center border-b border-dashed border-gray-300 dark:border-white/20 pb-4 mb-6">
                <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-1">
                  চূড়ান্ত হিসাব
                </h2>
                <p className="text-sm text-emerald-600 dark:text-emerald-400 font-bold">
                  {eventData.name || "Unnamed Event"}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="text-center">
                  <p className="text-[10px] text-gray-600 dark:text-gray-300 uppercase mb-1">
                    সংগ্রহ
                  </p>
                  <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                    ৳{formatMoney(totalCollected)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-gray-600 dark:text-gray-300 uppercase mb-1">
                    খরচ
                  </p>
                  <p className="text-lg font-black text-pink-600 dark:text-pink-400">
                    ৳{formatMoney(totalExpense)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-gray-600 dark:text-gray-300 uppercase mb-1">
                    গ্রুপ ফান্ড
                  </p>
                  <p
                    className={`text-lg font-black ${
                      groupFundBalance < -EPSILON
                        ? "text-red-500"
                        : "text-purple-600 dark:text-purple-400"
                    }`}
                  >
                    ৳{formatMoney(groupFundBalance)}
                  </p>
                </div>
              </div>

              <p className="text-xs text-gray-700 dark:text-gray-200 font-bold uppercase mb-3">
                ব্যক্তিগত হিসাব:
              </p>
              <div className="space-y-3 mb-6">
                {Object.values(settlementData).map((data) => {
                  const net = data.net;
                  const isRecv = net > EPSILON;
                  const isPay = net < -EPSILON;
                  return (
                    <div
                      key={data.id}
                      className="bg-white dark:bg-black/40 p-3 rounded-xl flex justify-between items-center border border-gray-100 dark:border-transparent border-l-4 shadow-sm"
                      style={{
                        borderLeftColor: isRecv
                          ? "#10b981"
                          : isPay
                          ? "#ef4444"
                          : "#6b7280",
                      }}
                    >
                      <div>
                        <p className="font-bold text-gray-800 dark:text-white text-sm">
                          {data.name}
                        </p>
                        <p className="text-[10px] text-gray-600 dark:text-gray-300 mt-0.5">
                          জমা: ৳{formatMoney(data.deposit)} | পকেট: ৳
                          {formatMoney(data.pocketPaid)} | ভোগ: ৳
                          {formatMoney(data.consumed)}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        {isRecv ? (
                          <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                            +৳{formatMoney(net)}
                          </span>
                        ) : isPay ? (
                          <span className="text-sm font-black text-red-600 dark:text-red-400">
                            -৳{formatMoney(Math.abs(net))}
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-gray-500 dark:text-gray-300">
                            ক্লিয়ার
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="text-xs text-purple-700 dark:text-purple-300 font-black uppercase mb-3">
                লেনদেন নির্দেশিকা:
              </p>
              {transactions.length === 0 ? (
                <div className="bg-emerald-50/70 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl p-4 text-center">
                  <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                    <i className="fa-solid fa-circle-check mr-1.5"></i>
                    সবার হিসাব ক্লিয়ার!
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {transactions.map((tx, idx) => (
                    <div
                      key={idx}
                      className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-3 rounded-xl flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        <span
                          className={`font-black px-2 py-1 rounded-lg ${
                            tx.fromIsFund
                              ? "bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-200"
                              : "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-200"
                          }`}
                        >
                          {tx.from}
                        </span>
                        <span className="text-gray-500 dark:text-gray-300 text-xs font-bold">
                          <i className="fa-solid fa-arrow-right"></i>
                        </span>
                        <span
                          className={`font-black px-2 py-1 rounded-lg ${
                            tx.toIsFund
                              ? "bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-200"
                              : "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-200"
                          }`}
                        >
                          {tx.to}
                        </span>
                      </div>
                      <span className="text-sm font-black text-gray-900 dark:text-white bg-white dark:bg-black/40 px-3 py-1 rounded-lg border border-gray-200 dark:border-white/10">
                        ৳{formatMoney(tx.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══ TAB 5: SLIPS ═══ */}
        {activeTab === "slips" && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-[#0a1c13] border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-soft dark:shadow-xl">
              <h2 className="text-xl font-black text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <i className="fa-solid fa-scroll text-amber-500"></i>
                স্লিপ জেনারেটর
              </h2>
              <p className="text-xs text-gray-700 dark:text-gray-300 mb-6">
                প্রতিটি সদস্যের জন্য আলাদা স্লিপ অথবা সম্পূর্ণ ইভেন্টের
                সারসংক্ষেপ স্লিপ — সব হিসাব স্বচ্ছভাবে ডাউনলোড করুন।
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                <button
                  onClick={() => {
                    setSlipMode("summary");
                    setSlipMemberId("");
                  }}
                  className={`p-4 rounded-2xl border-2 text-left transition-all ${
                    slipMode === "summary"
                      ? "bg-amber-50 dark:bg-amber-500/10 border-amber-400"
                      : "bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 hover:border-amber-300"
                  }`}
                >
                  <i className="fa-solid fa-file-invoice text-2xl text-amber-500 mb-2"></i>
                  <p className="font-black text-gray-900 dark:text-white text-sm">
                    সারসংক্ষেপ স্লিপ
                  </p>
                  <p className="text-[10px] text-gray-700 dark:text-gray-300 mt-1">
                    পুরো ইভেন্টের মোট হিসাব, সকল সদস্যের ব্যালান্স ও লেনদেন
                  </p>
                </button>

                <button
                  onClick={() => {
                    setSlipMode("all");
                    setSlipMemberId("");
                  }}
                  className={`p-4 rounded-2xl border-2 text-left transition-all ${
                    slipMode === "all"
                      ? "bg-amber-50 dark:bg-amber-500/10 border-amber-400"
                      : "bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 hover:border-amber-300"
                  }`}
                >
                  <i className="fa-solid fa-users text-2xl text-amber-500 mb-2"></i>
                  <p className="font-black text-gray-900 dark:text-white text-sm">
                    সকল সদস্যের আলাদা স্লিপ
                  </p>
                  <p className="text-[10px] text-gray-700 dark:text-gray-300 mt-1">
                    প্রত্যেক সদস্যের জন্য আলাদা পৃষ্ঠা, একটাই PDF-এ
                  </p>
                </button>
              </div>

              <div className="mb-5">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
                  অথবা একজন নির্দিষ্ট সদস্য বেছে নিন:
                </label>
                <select
                  value={slipMode === "member" ? slipMemberId : ""}
                  onChange={(e) => {
                    setSlipMemberId(e.target.value);
                    setSlipMode(e.target.value ? "member" : "none");
                  }}
                  className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:border-amber-500 outline-none"
                >
                  <option value="">-- একজন সদস্য সিলেক্ট করুন --</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3 mb-5 p-3 bg-gray-50 dark:bg-white/5 rounded-xl">
                <input
                  type="checkbox"
                  id="bn-digits"
                  checked={slipUseBanglaDigits}
                  onChange={(e) => setSlipUseBanglaDigits(e.target.checked)}
                  className="w-5 h-5 accent-amber-500 cursor-pointer"
                />
                <label
                  htmlFor="bn-digits"
                  className="text-sm font-bold text-gray-700 dark:text-gray-200 cursor-pointer"
                >
                  বাংলা সংখ্যা ব্যবহার করুন (১, ২, ৩...)
                </label>
              </div>

              {slipMode !== "none" && (
                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200 dark:border-white/10">
                  <button
                    onClick={downloadPNG}
                    disabled={isGenerating}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-3.5 rounded-xl font-black uppercase tracking-widest transition-all shadow-md hover:-translate-y-1 flex justify-center items-center gap-2 disabled:opacity-60"
                  >
                    {isGenerating ? (
                      <i className="fa-solid fa-spinner fa-spin"></i>
                    ) : (
                      <i className="fa-solid fa-image"></i>
                    )}
                    PNG ডাউনলোড
                  </button>
                  <button
                    onClick={downloadPDF}
                    disabled={isGenerating}
                    className="flex-1 bg-red-600 hover:bg-red-500 text-white py-3.5 rounded-xl font-black uppercase tracking-widest transition-all shadow-md hover:-translate-y-1 flex justify-center items-center gap-2 disabled:opacity-60"
                  >
                    {isGenerating ? (
                      <i className="fa-solid fa-spinner fa-spin"></i>
                    ) : (
                      <i className="fa-solid fa-file-pdf"></i>
                    )}
                    PDF ডাউনলোড (মাল্টি-পেজ)
                  </button>
                </div>
              )}
            </div>

            {slipMode !== "none" && (
              <div className="bg-white dark:bg-[#0a1c13] border border-gray-200 dark:border-white/10 rounded-3xl p-4 sm:p-6 overflow-x-auto">
                <p className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-4 uppercase tracking-widest">
                  <i className="fa-solid fa-eye mr-1.5"></i>
                  প্রিভিউ
                </p>
                <div className="flex justify-center min-w-max">
                  <div
                    style={{
                      transform: "scale(0.85)",
                      transformOrigin: "top center",
                    }}
                  >
                    {slipMode === "summary" && (
                      <SummarySlip
                        eventData={eventData}
                        members={members}
                        expenses={expenses}
                        settlementData={settlementData}
                        transactions={transactions}
                        totalCollected={totalCollected}
                        totalExpense={totalExpense}
                        groupFundBalance={groupFundBalance}
                        useBangla={slipUseBanglaDigits}
                      />
                    )}
                    {slipMode === "member" &&
                      memberSlips
                        .filter((s) => s.member.id === slipMemberId)
                        .map((slip) => (
                          <MemberSlip
                            key={slip.member.id}
                            slip={slip}
                            eventData={eventData}
                            useBangla={slipUseBanglaDigits}
                          />
                        ))}
                    {slipMode === "all" &&
                      memberSlips.map((slip, idx) => (
                        <div
                          key={slip.member.id}
                          style={{ marginTop: idx > 0 ? 20 : 0 }}
                        >
                          <MemberSlip
                            slip={slip}
                            eventData={eventData}
                            useBangla={slipUseBanglaDigits}
                          />
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══ GROUP FUND WARNING MODAL — redesigned ═══ */}
      {fundWarning && (
        <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className="bg-white dark:bg-[#0a1c13] border-2 border-red-300 dark:border-red-500/50 rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl relative max-h-[92vh] overflow-y-auto"
            data-aos="zoom-in"
          >
            <div className="w-16 h-16 bg-red-100 dark:bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-red-300 dark:border-red-500/40">
              <i className="fa-solid fa-triangle-exclamation text-3xl text-red-500"></i>
            </div>

            <h3 className="text-xl font-black text-gray-900 dark:text-white text-center mb-2">
              গ্রুপ ফান্ড শেষ!
            </h3>
            <p className="text-sm text-gray-700 dark:text-gray-300 text-center mb-5 leading-relaxed">
              এই খরচ যুক্ত করলে গ্রুপ ফান্ডে{" "}
              <span className="font-black text-red-500">
                ৳{formatMoney(fundWarning.shortage)}
              </span>{" "}
              ঘাটতি পড়বে। গ্রুপ ফান্ড কখনোই নেগেটিভ হতে পারে না — তাই
              বিকল্প একটা উপায় বেছে নিন।
            </p>

            {/* Option 1: Personal pocket — inline save */}
            <div className="bg-emerald-50 dark:bg-emerald-500/10 border-2 border-emerald-200 dark:border-emerald-500/40 rounded-2xl p-4 mb-3">
              <p className="text-xs font-bold text-emerald-800 dark:text-emerald-200 mb-2 flex items-center gap-1.5">
                <i className="fa-solid fa-user-check"></i>
                বিকল্প ১: কোন মেম্বার নিজ পকেট থেকে দিয়েছে?
              </p>
              <select
                value={warningPayerId}
                onChange={(e) => setWarningPayerId(e.target.value)}
                className="w-full bg-white dark:bg-black/40 border border-emerald-300 dark:border-emerald-500/40 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:border-emerald-500"
              >
                <option value="">-- মেম্বার সিলেক্ট করুন --</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!warningPayerId}
                onClick={handleWarningSaveAsPersonal}
                className="w-full mt-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white py-3 rounded-lg font-bold text-sm transition-all shadow-md flex justify-center items-center gap-2"
              >
                <i className="fa-solid fa-check"></i>
                এই মেম্বারের পকেট থেকে সেভ করুন
              </button>
            </div>

            {/* Option 2: Topup */}
            <button
              onClick={handleWarningGoToMembers}
              className="w-full bg-purple-600 hover:bg-purple-500 text-white py-3 rounded-xl font-bold mb-2.5 transition-all shadow-md hover:-translate-y-0.5 flex justify-center items-center gap-2"
            >
              <i className="fa-solid fa-coins"></i>
              গ্রুপ ফান্ডে আরো টাকা জমা দিন
            </button>

            {/* Option 3: Cancel */}
            <button
              onClick={handleWarningCancel}
              className="w-full bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-200 py-3 rounded-xl font-bold transition-colors hover:bg-gray-200 dark:hover:bg-white/20"
            >
              <i className="fa-solid fa-xmark mr-1"></i>বাতিল করুন
            </button>

            <p className="text-[10px] text-gray-500 dark:text-gray-400 text-center mt-3 italic">
              খরচটি সংরক্ষিত হবে যখন আপনি উপরের যেকোনো একটা বাটনে ক্লিক করবেন
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
