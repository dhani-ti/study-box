"use client";

import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { useAuth } from "@/components/AuthProvider";

// Daftar subject milik pengguna (dipakai untuk dropdown di Notes, Files, Tasks).
export function useSubjects() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState([]);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    supabase
      .from("subjects")
      .select("*")
      .order("name", { ascending: true })
      .then(({ data }) => {
        if (alive) setSubjects(data || []);
      });
    return () => {
      alive = false;
    };
  }, [user]);

  return subjects;
}
