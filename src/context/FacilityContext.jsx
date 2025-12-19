// src/context/FacilityContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../api/supabaseClient";
import { FACILITY_ID } from "../lib/constants";

const FacilityContext = createContext(null);

export function useFacility() {
  const context = useContext(FacilityContext);
  if (!context) {
    throw new Error("useFacility must be used within a FacilityProvider");
  }
  return context;
}

// Default values for reset
export const DEFAULT_FACILITY_NAME = "Meine Einrichtung";
export const DEFAULT_DISPLAY_NAME = "Meine Einrichtung";
export const DEFAULT_FACILITY_LOGO = null;

export function FacilityProvider({ children }) {
  const [facility, setFacility] = useState({
    name: DEFAULT_FACILITY_NAME,
    display_name: DEFAULT_DISPLAY_NAME,
    logo_url: DEFAULT_FACILITY_LOGO,
    address: "",
    phone: "",
    email: "",
    opening_hours: "",
    info_text: "",
  });
  const [loading, setLoading] = useState(true);

  const loadFacility = async () => {
    try {
      const { data, error } = await supabase
        .from("facilities")
        .select("*")
        .eq("id", FACILITY_ID)
        .single();

      if (error) throw error;

      if (data) {
        setFacility({
          name: data.name || DEFAULT_FACILITY_NAME,
          // display_name für Header/Login, fallback auf name
          display_name: data.display_name || data.name || DEFAULT_DISPLAY_NAME,
          logo_url: data.logo_url || DEFAULT_FACILITY_LOGO,
          address: data.address || "",
          phone: data.phone || "",
          email: data.email || "",
          opening_hours: data.opening_hours || "",
          info_text: data.info_text || "",
        });
      }
    } catch (err) {
      console.error("Facility laden fehlgeschlagen:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFacility();

    // Realtime subscription for facility updates
    const channel = supabase
      .channel("facility-changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "facilities",
          filter: `id=eq.${FACILITY_ID}`,
        },
        (payload) => {
          const data = payload.new;
          setFacility({
            name: data.name || DEFAULT_FACILITY_NAME,
            display_name: data.display_name || data.name || DEFAULT_DISPLAY_NAME,
            logo_url: data.logo_url || DEFAULT_FACILITY_LOGO,
            address: data.address || "",
            phone: data.phone || "",
            email: data.email || "",
            opening_hours: data.opening_hours || "",
            info_text: data.info_text || "",
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Function to refresh facility data
  const refreshFacility = () => {
    loadFacility();
  };

  return (
    <FacilityContext.Provider value={{ facility, loading, refreshFacility }}>
      {children}
    </FacilityContext.Provider>
  );
}
