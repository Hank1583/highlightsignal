"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useGAConnections } from "../../../dataSource";
import { useGaReportDetail, useGaReportUpdate } from "../../../dataSource";

const sectionOptions = [
  { key: "overview", label: "Overview" },
  { key: "traffic", label: "Traffic Sources" },
  { key: "pages", label: "Top Pages" },
  { key: "events", label: "Events" },
  { key: "conversions", label: "Conversions" },
];

export default function ReportEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const { gaConnections, loading: gaLoading, error: gaError } = useGAConnections();
  const { reportDetail, loading, error } = useGaReportDetail(id);
  const { updateReport, saving, error: updateError } = useGaReportUpdate();

  const [form, setForm] = useState({
    report_name: "",
    report_type: "weekly",
    connection_ids: [] as number[],
    send_weekday: "1",
    send_monthday: "1",
    send_time: "09:00",
    email_subject: "",
    email_list: [""],
    section_list: ["overview"],
    is_active: true,
  });

  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!reportDetail || initialized) return;

    setForm({
      report_name: reportDetail.report_name || "",
      report_type: reportDetail.report_type || "weekly",
      connection_ids: reportDetail.connection_ids || [],
      send_weekday: String(reportDetail.send_weekday || 1),
      send_monthday: String(reportDetail.send_monthday || 1),
      send_time: reportDetail.send_time || "09:00",
      email_subject: reportDetail.email_subject || "",
      email_list: reportDetail.email_list?.length ? reportDetail.email_list : [""],
      section_list: reportDetail.section_list?.length
        ? reportDetail.section_list
        : ["overview"],
      is_active: Boolean(reportDetail.is_active),
    });

    setInitialized(true);
  }, [reportDetail, initialized]);

  const updateEmail = (index: number, value: string) => {
    const next = [...form.email_list];
    next[index] = value;
    setForm({ ...form, email_list: next });
  };

  const addEmail = () => {
    setForm({ ...form, email_list: [...form.email_list, ""] });
  };

  const removeEmail = (index: number) => {
    const next = form.email_list.filter((_, i) => i !== index);
    setForm({ ...form, email_list: next.length ? next : [""] });
  };

  const toggleSection = (key: string) => {
    const exists = form.section_list.includes(key);
    const next = exists
      ? form.section_list.filter((s) => s !== key)
      : [...form.section_list, key];

    setForm({ ...form, section_list: next });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      ...form,
      report_name: form.report_name.trim(),
      email_subject: form.email_subject.trim(),
      connection_ids: form.connection_ids.map(Number),
      send_weekday: Number(form.send_weekday),
      send_monthday: Number(form.send_monthday),
      email_list: form.email_list.map((email) => email.trim()).filter(Boolean),
    };

    if (!payload.report_name) {
      alert("請輸入報表名稱");
      return;
    }

    if (payload.connection_ids.length === 0) {
      alert("請至少選擇一個 GA");
      return;
    }

    if (!payload.email_subject) {
      alert("請輸入 Email 主旨");
      return;
    }

    if (payload.email_list.length === 0) {
      alert("請至少輸入一位收件者");
      return;
    }

    try {
      await updateReport(id, payload);
      alert("更新成功");
      router.push("/ga/report");
    } catch (err) {
      console.error(err);
      alert("更新失敗");
    }
  };

  if (loading) {
    return <div className="text-sm text-slate-500">載入報表資料中...</div>;
  }

  if (error) {
    return <div className="text-sm text-red-500">{error}</div>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">編輯報表</h1>
        <p className="mt-1 text-sm text-slate-500">
          修改 GA 週報 / 月報寄送排程
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              報表名稱
            </label>
            <input
              className="w-full rounded-xl border border-slate-300 px-3 py-2"
              value={form.report_name}
              onChange={(e) =>
                setForm({ ...form, report_name: e.target.value })
              }
              placeholder="例如：主站週報"
            />
          </div>
        </div>

        <div>
          <label className="mb-3 block text-sm font-medium text-slate-700">
            選擇 GA（可多選）
          </label>

          <div className="grid gap-3 md:grid-cols-2">
            {gaLoading ? (
              <div className="text-sm text-slate-400">載入 GA 帳號中...</div>
            ) : gaError ? (
              <div className="text-sm text-red-500">{gaError}</div>
            ) : (
              gaConnections.map((item) => {
                const checked = form.connection_ids.includes(item.id);

                return (
                  <label
                    key={item.id}
                    className="flex items-center gap-2 rounded-xl border border-slate-200 p-3"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        setForm((prev) => ({
                          ...prev,
                          connection_ids: checked
                            ? prev.connection_ids.filter((cid) => cid !== item.id)
                            : [...prev.connection_ids, item.id],
                        }));
                      }}
                    />
                    <span>{item.account_name}</span>
                  </label>
                );
              })
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              報表類型
            </label>
            <select
              className="w-full rounded-xl border border-slate-300 px-3 py-2"
              value={form.report_type}
              onChange={(e) =>
                setForm({ ...form, report_type: e.target.value })
              }
            >
              <option value="weekly">週報</option>
              <option value="monthly">月報</option>
            </select>
          </div>

          {form.report_type === "weekly" ? (
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                寄送星期
              </label>
              <select
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
                value={form.send_weekday}
                onChange={(e) =>
                  setForm({ ...form, send_weekday: e.target.value })
                }
              >
                <option value="1">週一</option>
                <option value="2">週二</option>
                <option value="3">週三</option>
                <option value="4">週四</option>
                <option value="5">週五</option>
                <option value="6">週六</option>
                <option value="7">週日</option>
              </select>
            </div>
          ) : (
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                每月幾號
              </label>
              <input
                type="number"
                min="1"
                max="28"
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
                value={form.send_monthday}
                onChange={(e) =>
                  setForm({ ...form, send_monthday: e.target.value })
                }
              />
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              寄送時間
            </label>
            <select
              className="w-full rounded-xl border border-slate-300 px-3 py-2"
              value={form.send_time}
              onChange={(e) =>
                setForm({ ...form, send_time: e.target.value })
              }
            >
              {Array.from({ length: 24 }).map((_, i) => {
                const hour = i.toString().padStart(2, "0");
                return (
                  <option key={hour} value={`${hour}:00`}>
                    {hour}:00
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Email 主旨
          </label>
          <input
            className="w-full rounded-xl border border-slate-300 px-3 py-2"
            value={form.email_subject}
            onChange={(e) =>
              setForm({ ...form, email_subject: e.target.value })
            }
            placeholder="例如：GA 週報"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            收件者清單
          </label>
          <div className="space-y-2">
            {form.email_list.map((email, index) => (
              <div key={index} className="flex gap-2">
                <input
                  className="flex-1 rounded-xl border border-slate-300 px-3 py-2"
                  value={email}
                  onChange={(e) => updateEmail(index, e.target.value)}
                  placeholder="name@example.com"
                />
                <button
                  type="button"
                  onClick={() => removeEmail(index)}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                >
                  刪除
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addEmail}
            className="mt-3 rounded-xl bg-slate-100 px-3 py-2 text-sm"
          >
            新增收件者
          </button>
        </div>

        <div>
          <label className="mb-3 block text-sm font-medium text-slate-700">
            報表內容類型
          </label>
          <div className="grid gap-3 md:grid-cols-2">
            {sectionOptions.map((item) => (
              <label
                key={item.key}
                className="flex items-center gap-2 rounded-xl border border-slate-200 p-3"
              >
                <input
                  type="checkbox"
                  checked={form.section_list.includes(item.key)}
                  onChange={() => toggleSection(item.key)}
                />
                <span>{item.label}</span>
              </label>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) =>
              setForm({ ...form, is_active: e.target.checked })
            }
          />
          <span className="text-sm text-slate-700">啟用此報表</span>
        </label>

        {updateError && (
          <div className="text-sm text-red-500">{updateError}</div>
        )}

        <div className="flex justify-end gap-3">
          <a
            href="/ga/report"
            className="rounded-xl border border-slate-300 px-4 py-2"
          >
            取消
          </a>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
          >
            {saving ? "更新中..." : "更新"}
          </button>
        </div>
      </form>
    </div>
  );
}