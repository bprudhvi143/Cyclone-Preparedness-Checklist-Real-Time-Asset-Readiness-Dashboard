import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "../services/api";
import { Zone, Ward, Shelter, ChecklistTemplate } from "../types";
import { DEFAULT_DISASTER_TYPE_ID, DEFAULT_OPERATIONAL_CYCLE_ID } from "../config/constants";
import Card from "../components/Card";
import Button from "../components/Button";
import { MapPin, Upload, CheckCircle2, Save, Trash2, AlertTriangle } from "lucide-react";

interface AnswerState {
  value: "YES" | "NO" | "NOT_APPLICABLE";
  remarks: string;
}

export const ChecklistSubmitPage: React.FC = () => {
  // Dropdown states
  const [selectedZone, setSelectedZone] = useState("");
  const [selectedWard, setSelectedWard] = useState("");
  const [selectedShelter, setSelectedShelter] = useState("");

  // Answers & Photos local cache
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [photos, setPhotos] = useState<Record<string, File>>({});
  const [photoPreviews, setPhotoPreviews] = useState<Record<string, string>>({});

  // Geolocation states
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [geoError, setGeoError] = useState("");
  const [geoDistance, setGeoDistance] = useState<number | null>(null);

  // 1. Fetch Zones
  const { data: zones = [] } = useQuery<Zone[]>({
    queryKey: ["zones"],
    queryFn: async () => {
      const res = await api.get("/api/v1/locations/zones");
      return res.data;
    },
  });

  // 2. Fetch Wards
  const { data: wards = [] } = useQuery<Ward[]>({
    queryKey: ["wards"],
    queryFn: async () => {
      const res = await api.get("/api/v1/locations/wards");
      return res.data;
    },
  });

  // Filtered Wards based on selected zone
  const filteredWards = wards.filter((w) => w.zone_id === selectedZone);

  // 3. Fetch Shelters
  const { data: shelters = [] } = useQuery<Shelter[]>({
    queryKey: ["shelters"],
    queryFn: async () => {
      const res = await api.get("/api/v1/shelters/");
      return res.data;
    },
  });

  // Filtered Shelters based on selected ward
  const filteredShelters = shelters.filter((s) => s.ward_id === selectedWard);

  // Get active selected shelter details
  const activeShelter = shelters.find((s) => s.id === selectedShelter);

  // 4. Fetch Active Template
  const { data: template, isLoading: templateLoading } = useQuery<ChecklistTemplate>({
    queryKey: ["active-template"],
    queryFn: async () => {
      const res = await api.get(`/api/v1/checklists/templates/active?disaster_type_id=${DEFAULT_DISASTER_TYPE_ID}`);
      return res.data;
    },
  });

  // 5. Geolocation fetch
  const getDeviceLocation = () => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setGeoError("");
      },
      (error) => {
        setGeoError(`Unable to retrieve GPS coordinates: ${error.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  useEffect(() => {
    getDeviceLocation();
  }, []);

  // Calculate Distance (Haversine formula) to verify physical proximity to shelter
  useEffect(() => {
    if (!coords || !activeShelter) {
      setGeoDistance(null);
      return;
    }
    const toRad = (x: number) => (x * Math.PI) / 180;
    const R = 6371e3; // Earth radius in meters
    const dLat = toRad(activeShelter.latitude - coords.latitude);
    const dLon = toRad(activeShelter.longitude - coords.longitude);
    const lat1 = toRad(coords.latitude);
    const lat2 = toRad(activeShelter.latitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const dist = R * c; // in meters
    setGeoDistance(Math.round(dist));
  }, [coords, activeShelter]);

  // Load Saved Draft on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem("gvmc_checklist_draft");
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        setSelectedZone(parsed.zone || "");
        setSelectedWard(parsed.ward || "");
        setSelectedShelter(parsed.shelter || "");
        setAnswers(parsed.answers || {});
      } catch (e) {
        console.error("Failed to parse draft", e);
      }
    }
  }, []);

  // Save Draft function
  const handleSaveDraft = () => {
    const draft = {
      zone: selectedZone,
      ward: selectedWard,
      shelter: selectedShelter,
      answers,
    };
    localStorage.setItem("gvmc_checklist_draft", JSON.stringify(draft));
    alert("Draft saved successfully to local storage!");
  };

  const handleClearDraft = () => {
    localStorage.removeItem("gvmc_checklist_draft");
    setSelectedZone("");
    setSelectedWard("");
    setSelectedShelter("");
    setAnswers({});
    setPhotos({});
    setPhotoPreviews({});
    alert("Draft cleared!");
  };

  // Handle Response selection
  const handleResponseChange = (qId: string, value: "YES" | "NO" | "NOT_APPLICABLE") => {
    setAnswers((prev) => ({
      ...prev,
      [qId]: {
        value,
        remarks: prev[qId]?.remarks || "",
      },
    }));
  };

  // Handle Remarks entry
  const handleRemarksChange = (qId: string, remarks: string) => {
    setAnswers((prev) => ({
      ...prev,
      [qId]: {
        value: prev[qId]?.value || "YES",
        remarks,
      },
    }));
  };

  // Handle Image uploads
  const handlePhotoUpload = (qId: string, file: File | null) => {
    if (!file) {
      setPhotos((prev) => {
        const next = { ...prev };
        delete next[qId];
        return next;
      });
      setPhotoPreviews((prev) => {
        const next = { ...prev };
        delete next[qId];
        return next;
      });
      return;
    }

    setPhotos((prev) => ({ ...prev, [qId]: file }));
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreviews((prev) => ({ ...prev, [qId]: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  // Checklist submission mutation
  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!selectedShelter) throw new Error("Shelter is required.");
      if (!coords) throw new Error("GPS Coordinates are required.");

      // Check if all questions are answered
      const questionsCount = template?.sections?.flatMap((s) => s.questions).length || 0;
      const answeredCount = Object.keys(answers).length;

      if (answeredCount < questionsCount) {
        throw new Error(`Please complete all questions. Answered ${answeredCount} of ${questionsCount}.`);
      }

      // Verify photo requirement
      template?.sections?.forEach((sec) => {
        sec.questions.forEach((q) => {
          if (q.requires_photo && answers[q.id]?.value === "YES" && !photos[q.id]) {
            throw new Error(`Question "${q.question_text}" requires a verification photo.`);
          }
        });
      });

      const payloadObj = {
        operational_cycle_id: DEFAULT_OPERATIONAL_CYCLE_ID,
        shelter_id: selectedShelter,
        responses: Object.entries(answers).map(([qId, ans]) => ({
          question_id: qId,
          response_value: ans.value,
          remarks: ans.remarks || "",
        })),
        latitude: coords.latitude,
        longitude: coords.longitude,
      };

      const formData = new FormData();
      formData.append("payload", JSON.stringify(payloadObj));

      // Append upload files
      Object.entries(photos).forEach(([qId, file]) => {
        formData.append(qId, file);
      });

      const res = await api.post("/api/v1/checklists/submissions", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data;
    },
    onSuccess: () => {
      localStorage.removeItem("gvmc_checklist_draft");
      alert("Checklist submitted successfully!");
      setAnswers({});
      setPhotos({});
      setPhotoPreviews({});
      setSelectedShelter("");
    },
    onError: (err: any) => {
      alert(err.message || "Failed to submit checklist.");
    },
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* 1. Header Banner */}
      <div className="bg-white p-6 border border-slate-100 rounded-2xl shadow-soft flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Cyclone Preparedness Inspection</h1>
          <p className="text-xs text-slate-400 mt-1">Submit dynamic checklists directly to the Executive Control Center</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" icon={<Save className="h-4 w-4" />} onClick={handleSaveDraft}>
            Save Draft
          </Button>
          <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50" icon={<Trash2 className="h-4 w-4" />} onClick={handleClearDraft}>
            Reset
          </Button>
        </div>
      </div>

      {/* 2. Geofence & Location Tracker */}
      <Card bodyClassName="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
        <div className="flex items-center gap-3">
          <MapPin className="h-6 w-6 text-primary" />
          <div className="space-y-0.5 text-xs">
            <p className="font-semibold text-slate-700">Audit Geolocation Status</p>
            {coords ? (
              <p className="text-slate-400">
                Lat: {coords.latitude.toFixed(6)}, Lon: {coords.longitude.toFixed(6)}
              </p>
            ) : (
              <p className="text-red-500 font-medium">GPS Fetching...</p>
            )}
            {geoError && <p className="text-red-500 font-bold">{geoError}</p>}
          </div>
        </div>

        {activeShelter && (
          <div className="text-right text-xs shrink-0">
            {geoDistance !== null ? (
              geoDistance <= 100 ? (
                <div className="inline-flex items-center gap-1 bg-accent/10 text-accent px-2.5 py-1 rounded-full font-semibold">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>On-Site (Within {geoDistance}m)</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1 bg-alert/10 text-alert px-2.5 py-1 rounded-full font-semibold">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>Off-Site Warning (Distance: {geoDistance}m)</span>
                </div>
              )
            ) : (
              <span className="text-slate-400">Calculating distance to shelter...</span>
            )}
          </div>
        )}
      </Card>

      {/* 3. Selector Panel */}
      <Card title="Inspected Site Hierarchy">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Zone Selector */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">Select Zone</label>
            <select
              value={selectedZone}
              onChange={(e) => {
                setSelectedZone(e.target.value);
                setSelectedWard("");
                setSelectedShelter("");
              }}
              className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-primary focus:bg-white"
            >
              <option value="">-- Choose Zone --</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name} ({z.code})
                </option>
              ))}
            </select>
          </div>

          {/* Ward Selector */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">Select Ward</label>
            <select
              value={selectedWard}
              onChange={(e) => {
                setSelectedWard(e.target.value);
                setSelectedShelter("");
              }}
              disabled={!selectedZone}
              className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-primary focus:bg-white disabled:opacity-50"
            >
              <option value="">-- Choose Ward --</option>
              {filteredWards.map((w) => (
                <option key={w.id} value={w.id}>
                  Ward #{w.number} - {w.name}
                </option>
              ))}
            </select>
          </div>

          {/* Shelter Selector */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">Select Shelter</label>
            <select
              value={selectedShelter}
              onChange={(e) => setSelectedShelter(e.target.value)}
              disabled={!selectedWard}
              className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-primary focus:bg-white disabled:opacity-50"
            >
              <option value="">-- Choose Shelter --</option>
              {filteredShelters.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} (Cap: {s.capacity})
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* 4. Checklist Questionnaire Form */}
      {templateLoading ? (
        <p className="text-slate-400 text-center text-sm">Loading dynamic checklist template questions...</p>
      ) : selectedShelter && template?.sections ? (
        <div className="space-y-6">
          {template.sections.map((section) => (
            <Card key={section.id} title={section.title} subtitle="Complete all question parameters below">
              <div className="space-y-6 divide-y divide-slate-100">
                {section.questions.map((q, idx) => (
                  <div key={q.id} className={`pt-6 ${idx === 0 ? "pt-0" : ""}`}>
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      {/* Question Text */}
                      <div className="space-y-1 flex-1">
                        <p className="text-sm font-semibold text-slate-700">
                          {q.question_text}
                          {q.is_critical && (
                            <span className="ml-2 text-[10px] font-black text-critical bg-critical/5 border border-critical/15 px-2 py-0.5 rounded-full uppercase">
                              Critical Parameter
                            </span>
                          )}
                        </p>
                      </div>

                      {/* Response Radio Group */}
                      <div className="flex items-center gap-4 shrink-0 text-xs font-medium">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name={`response-${q.id}`}
                            checked={answers[q.id]?.value === "YES"}
                            onChange={() => handleResponseChange(q.id, "YES")}
                            className="text-primary focus:ring-primary h-4 w-4"
                          />
                          <span>YES</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer text-critical">
                          <input
                            type="radio"
                            name={`response-${q.id}`}
                            checked={answers[q.id]?.value === "NO"}
                            onChange={() => handleResponseChange(q.id, "NO")}
                            className="text-critical focus:ring-critical h-4 w-4"
                          />
                          <span>NO</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer text-slate-400">
                          <input
                            type="radio"
                            name={`response-${q.id}`}
                            checked={answers[q.id]?.value === "NOT_APPLICABLE"}
                            onChange={() => handleResponseChange(q.id, "NOT_APPLICABLE")}
                            className="text-slate-400 focus:ring-slate-300 h-4 w-4"
                          />
                          <span>N/A</span>
                        </label>
                      </div>
                    </div>

                    {/* Remarks Input */}
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input
                        type="text"
                        placeholder="Add remarks or explanation..."
                        value={answers[q.id]?.remarks || ""}
                        onChange={(e) => handleRemarksChange(q.id, e.target.value)}
                        className="text-xs bg-slate-50 border border-slate-100 rounded-lg p-2 outline-none focus:border-primary focus:bg-white"
                      />

                      {/* Photo Verification Upload */}
                      {q.requires_photo && answers[q.id]?.value === "YES" && (
                        <div className="flex items-center gap-3">
                          <label className="inline-flex items-center justify-center gap-2 border border-dashed border-slate-200 hover:border-primary/50 bg-slate-50/50 hover:bg-slate-50 text-slate-500 rounded-lg px-3 py-2 cursor-pointer text-xs transition-colors w-full">
                            <Upload className="h-3.5 w-3.5" />
                            <span>{photos[q.id] ? "Change Photo" : "Upload Photo"}</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handlePhotoUpload(q.id, e.target.files?.[0] || null)}
                              className="hidden"
                            />
                          </label>
                          {photoPreviews[q.id] && (
                            <img src={photoPreviews[q.id]} alt="Preview" className="h-10 w-10 object-cover rounded-lg border border-slate-100" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}

          {/* Submit Action Button */}
          <Button
            onClick={() => submitMutation.mutate()}
            loading={submitMutation.isPending}
            className="w-full py-3"
            size="lg"
          >
            Submit Completed Preparedness Audit
          </Button>
        </div>
      ) : (
        <Card bodyClassName="text-center py-12">
          <p className="text-sm text-slate-450">Please select a Zone, Ward, and Shelter to activate the questionnaire form.</p>
        </Card>
      )}
    </div>
  );
};
export default ChecklistSubmitPage;
