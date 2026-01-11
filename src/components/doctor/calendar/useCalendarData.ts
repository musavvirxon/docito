  useEffect(() => {
    if (!doctorId) return;

    const ch = supabase
      .channel(`doctor-calendar-${doctorId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'appointments', filter: `doctor_id=eq.${doctorId}` },
        () => fetchData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'blocked_times', filter: `doctor_id=eq.${doctorId}` },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [doctorId, fetchData]);
