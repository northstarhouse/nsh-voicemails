import React, { useEffect, useMemo, useState } from "react";
import {
  Search,
  Phone,
  Calendar,
  CheckCircle,
  Circle,
  Filter,
  ChevronDown,
  ChevronUp,
  Grid,
  List,
  Plus,
  Save,
} from "lucide-react";

const CATEGORY_LABELS = {
  wedding: "Wedding",
  tour: "Tour",
  event: "Event",
  vendor: "Vendor",
  other: "Other",
};

const deriveCategory = (message) => {
  const lowerMessage = message.toLowerCase();
  if (lowerMessage.includes("wedding") || lowerMessage.includes("bride")) return "wedding";
  if (lowerMessage.includes("tour") || lowerMessage.includes("visit")) return "tour";
  if (lowerMessage.includes("event") || lowerMessage.includes("party") || lowerMessage.includes("dinner")) {
    return "event";
  }
  if (lowerMessage.includes("vendor") || lowerMessage.includes("catering") || lowerMessage.includes("staffing")) {
    return "vendor";
  }
  return "other";
};

const formatDate = (dateStr) => {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    return (
      date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
      " at " +
      date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    );
  } catch {
    return dateStr;
  }
};

const normalizeApiVoicemails = (payload) => {
  const items = Array.isArray(payload) ? payload : payload?.voicemails || [];
  return items
    .map((item, idx) => ({
      id: item.id ?? idx + 1,
      phone: item.phone || "",
      message: (item.message || "").trim(),
      dateTime: item.dateTime || "",
      notes: item.notes || "",
      status: item.status || (item.notes ? "handled" : "pending"),
      category: item.category || deriveCategory(item.message || ""),
      rawText: item.rawText || "",
    }))
    .filter((vm) => vm.message && vm.message.length > 10);
};

const VoicemailManager = () => {
  const [voicemails, setVoicemails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState("cards");
  const [showNewForm, setShowNewForm] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [newEntry, setNewEntry] = useState({
    phone: "",
    message: "",
    dateTime: "",
    notes: "",
  });
  const [noteDraft, setNoteDraft] = useState("");

  const apiUrl = import.meta.env.VITE_VOICEMAILS_API_URL;

  const fetchVoicemails = async () => {
    setLoading(true);
    setError("");
    try {
      if (!apiUrl) {
        throw new Error("Missing VITE_VOICEMAILS_API_URL.");
      }
      const response = await fetch(`${apiUrl}?action=list`);
      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }
      const payload = await response.json();
      setVoicemails(normalizeApiVoicemails(payload));
    } catch (err) {
      console.error("Error fetching voicemails:", err);
      setError(err?.message || "Unable to load voicemails.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVoicemails();
  }, []);

  useEffect(() => {
    if (selectedMessage) {
      setNoteDraft(selectedMessage.notes || "");
    }
  }, [selectedMessage]);

  const filteredVoicemails = useMemo(
    () =>
      voicemails.filter((vm) => {
        const matchesSearch =
          vm.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
          vm.phone.includes(searchTerm) ||
          vm.notes.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === "all" || vm.status === statusFilter;
        const matchesCategory = categoryFilter === "all" || vm.category === categoryFilter;

        return matchesSearch && matchesStatus && matchesCategory;
      }),
    [voicemails, searchTerm, statusFilter, categoryFilter]
  );

  const stats = useMemo(
    () => ({
      total: voicemails.length,
      pending: voicemails.filter((v) => v.status === "pending").length,
      handled: voicemails.filter((v) => v.status === "handled").length,
      wedding: voicemails.filter((v) => v.category === "wedding").length,
    }),
    [voicemails]
  );

  const createVoicemail = async () => {
    setError("");
    try {
      if (!apiUrl) {
        throw new Error("Missing VITE_VOICEMAILS_API_URL.");
      }
      if (!newEntry.message.trim()) {
        throw new Error("Message is required.");
      }
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add",
          data: {
            phone: newEntry.phone.trim(),
            message: newEntry.message.trim(),
            dateTime: newEntry.dateTime,
            notes: newEntry.notes.trim(),
          },
        }),
      });
      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }
      setNewEntry({ phone: "", message: "", dateTime: "", notes: "" });
      setShowNewForm(false);
      await fetchVoicemails();
    } catch (err) {
      console.error("Error creating voicemail:", err);
      setError(err?.message || "Unable to create voicemail.");
    }
  };

  const saveNotes = async () => {
    if (!selectedMessage) return;
    setSavingNote(true);
    setError("");
    try {
      if (!apiUrl) {
        throw new Error("Missing VITE_VOICEMAILS_API_URL.");
      }
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateNotes",
          data: { id: selectedMessage.id, notes: noteDraft },
        }),
      });
      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }
      await fetchVoicemails();
    } catch (err) {
      console.error("Error saving notes:", err);
      setError(err?.message || "Unable to save notes.");
    } finally {
      setSavingNote(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#886c44] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-stone-600">Loading voicemails...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="bg-white border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col gap-1">
          <h1 className="text-2xl font-serif text-stone-800">Voicemail Management</h1>
          <p className="text-sm text-stone-600">North Star House</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border border-stone-200">
            <div className="text-2xl font-semibold text-stone-800">{stats.total}</div>
            <div className="text-xs text-stone-600 mt-1">Total Messages</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-stone-200">
            <div className="text-2xl font-semibold text-amber-600">{stats.pending}</div>
            <div className="text-xs text-stone-600 mt-1">Pending</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-stone-200">
            <div className="text-2xl font-semibold text-green-600">{stats.handled}</div>
            <div className="text-xs text-stone-600 mt-1">Handled</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-stone-200">
            <div className="text-2xl font-semibold text-[#886c44]">{stats.wedding}</div>
            <div className="text-xs text-stone-600 mt-1">Wedding Inquiries</div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-stone-200 p-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-center gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search messages, phone numbers, or notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:border-[#886c44]"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 border border-stone-300 rounded-lg hover:bg-stone-50"
            >
              <Filter className="w-4 h-4" />
              Filters
              {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setShowNewForm((prev) => !prev)}
              className="flex items-center gap-2 px-4 py-2 bg-[#886c44] text-white rounded-lg hover:bg-[#755c38]"
            >
              <Plus className="w-4 h-4" />
              New Voicemail
            </button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-stone-200">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-2">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:border-[#886c44]"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="handled">Handled</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-2">Category</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:border-[#886c44]"
                >
                  <option value="all">All Categories</option>
                  <option value="wedding">Wedding</option>
                  <option value="tour">Tour</option>
                  <option value="event">Event</option>
                  <option value="vendor">Vendor</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          )}

          {showNewForm && (
            <div className="mt-4 pt-4 border-t border-stone-200 grid gap-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Phone (optional)"
                  value={newEntry.phone}
                  onChange={(e) => setNewEntry((prev) => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:border-[#886c44]"
                />
                <input
                  type="datetime-local"
                  value={newEntry.dateTime}
                  onChange={(e) => setNewEntry((prev) => ({ ...prev, dateTime: e.target.value }))}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:border-[#886c44]"
                />
              </div>
              <textarea
                rows={3}
                placeholder="Voicemail message"
                value={newEntry.message}
                onChange={(e) => setNewEntry((prev) => ({ ...prev, message: e.target.value }))}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:border-[#886c44]"
              />
              <textarea
                rows={2}
                placeholder="Notes (optional)"
                value={newEntry.notes}
                onChange={(e) => setNewEntry((prev) => ({ ...prev, notes: e.target.value }))}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:border-[#886c44]"
              />
              <div className="flex justify-end">
                <button
                  onClick={createVoicemail}
                  className="flex items-center gap-2 px-4 py-2 bg-[#886c44] text-white rounded-lg hover:bg-[#755c38]"
                >
                  <Plus className="w-4 h-4" />
                  Add Voicemail
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-stone-600">
            Showing {filteredVoicemails.length} of {voicemails.length} messages
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode("cards")}
              className={`p-2 rounded-lg border ${
                viewMode === "cards"
                  ? "bg-[#886c44] text-white border-[#886c44]"
                  : "bg-white text-stone-600 border-stone-300 hover:bg-stone-50"
              }`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-lg border ${
                viewMode === "list"
                  ? "bg-[#886c44] text-white border-[#886c44]"
                  : "bg-white text-stone-600 border-stone-300 hover:bg-stone-50"
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {viewMode === "cards" ? (
          <div className="space-y-3">
            {filteredVoicemails.map((vm) => (
              <div
                key={vm.id}
                className="bg-white rounded-lg border border-stone-200 hover:border-[#886c44] transition-colors cursor-pointer"
                onClick={() => setSelectedMessage(selectedMessage?.id === vm.id ? null : vm)}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      {vm.status === "handled" ? (
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                      ) : (
                        <Circle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          {vm.phone && (
                            <div className="flex items-center gap-1 text-sm font-medium text-stone-800">
                              <Phone className="w-3 h-3" />
                              {vm.phone}
                            </div>
                          )}
                          <span className="px-2 py-0.5 bg-stone-100 text-stone-700 text-xs rounded">
                            {CATEGORY_LABELS[vm.category] || "Other"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-stone-500 mt-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(vm.dateTime)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-stone-700 line-clamp-2 ml-8">{vm.message}</p>

                  {vm.notes && (
                    <div className="mt-2 ml-8 p-2 bg-green-50 border border-green-200 rounded">
                      <p className="text-xs text-green-800">
                        <strong>Note:</strong> {vm.notes}
                      </p>
                    </div>
                  )}

                  {selectedMessage?.id === vm.id && (
                    <div className="mt-4 ml-8 pt-4 border-t border-stone-200">
                      <h4 className="text-xs font-medium text-stone-700 mb-2">Full Message:</h4>
                      <p className="text-sm text-stone-600 whitespace-pre-wrap mb-3">{vm.message}</p>
                      <label className="block text-xs font-medium text-stone-700 mb-2">Notes</label>
                      <textarea
                        rows={3}
                        value={noteDraft}
                        onChange={(e) => setNoteDraft(e.target.value)}
                        className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:border-[#886c44]"
                      />
                      <div className="flex justify-end mt-2">
                        <button
                          onClick={saveNotes}
                          disabled={savingNote}
                          className="flex items-center gap-2 px-3 py-2 bg-[#886c44] text-white rounded-lg hover:bg-[#755c38] disabled:opacity-60"
                        >
                          <Save className="w-4 h-4" />
                          {savingNote ? "Saving..." : "Save Notes"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {filteredVoicemails.length === 0 && (
              <div className="text-center py-12">
                <Search className="w-12 h-12 text-stone-300 mx-auto mb-4" />
                <p className="text-stone-600">No voicemails found matching your criteria</p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-stone-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-stone-50 border-b border-stone-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-stone-700">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-stone-700">Phone</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-stone-700">Message</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-stone-700">Category</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-stone-700">Date & Time</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-stone-700">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVoicemails.map((vm) => (
                    <tr
                      key={vm.id}
                      className="border-b border-stone-100 hover:bg-stone-50 cursor-pointer"
                      onClick={() => setSelectedMessage(selectedMessage?.id === vm.id ? null : vm)}
                    >
                      <td className="px-4 py-3">
                        {vm.status === "handled" ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <Circle className="w-4 h-4 text-amber-600" />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-xs text-stone-700">
                          <Phone className="w-3 h-3" />
                          {vm.phone || "-"}
                        </div>
                      </td>
                      <td className="px-4 py-3 max-w-md">
                        <p className="text-xs text-stone-700 line-clamp-2">{vm.message}</p>
                        {selectedMessage?.id === vm.id && (
                          <div className="mt-2 pt-2 border-t border-stone-200">
                            <p className="text-xs text-stone-600 whitespace-pre-wrap">{vm.message}</p>
                            <div className="mt-2">
                              <label className="block text-xs font-medium text-stone-700 mb-2">Notes</label>
                              <textarea
                                rows={3}
                                value={noteDraft}
                                onChange={(e) => setNoteDraft(e.target.value)}
                                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:border-[#886c44]"
                              />
                              <div className="flex justify-end mt-2">
                                <button
                                  onClick={saveNotes}
                                  disabled={savingNote}
                                  className="flex items-center gap-2 px-3 py-2 bg-[#886c44] text-white rounded-lg hover:bg-[#755c38] disabled:opacity-60"
                                >
                                  <Save className="w-4 h-4" />
                                  {savingNote ? "Saving..." : "Save Notes"}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-stone-100 text-stone-700 text-xs rounded">
                          {CATEGORY_LABELS[vm.category] || "Other"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-stone-600 whitespace-nowrap">{formatDate(vm.dateTime)}</div>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        {vm.notes ? (
                          <p className="text-xs text-green-800 line-clamp-2">{vm.notes}</p>
                        ) : (
                          <span className="text-xs text-stone-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredVoicemails.length === 0 && (
              <div className="text-center py-12">
                <Search className="w-12 h-12 text-stone-300 mx-auto mb-4" />
                <p className="text-stone-600">No voicemails found matching your criteria</p>
              </div>
            )}
          </div>
        )}

        <div className="mt-8 text-center text-xs text-stone-500">
          <button onClick={fetchVoicemails} className="text-[#886c44] hover:underline">
            Refresh Data
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoicemailManager;
