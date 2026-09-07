(() => {
  const list = document.querySelector('#record-list');
  const repository = window.northstarRepository;
  if (!list || !repository) return;

  const eligibleMembers = async () => (await repository.list('team')).filter((member) => ['Lead technician', 'Field technician', 'Apprentice'].includes(member.role));

  list.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-job-action="assign"]');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    button.disabled = true;
    try {
      const members = await eligibleMembers();
      if (!members.length) throw new Error('no_eligible_technicians');
      const names = members.map((member) => member.name).join(', ');
      const selected = window.prompt(`Choose a technician for this job:\n${names}`, button.dataset.jobValue || members[0].name);
      if (selected === null) return;
      const technician = members.find((member) => member.name.toLowerCase() === selected.trim().toLowerCase());
      if (!technician) {
        showToast('Choose a technician from the current field roster.');
        return;
      }
      await repository.updateJob(button.dataset.jobId, 'assign', technician.name);
      showToast(`Job assigned to ${technician.name}.`);
      openRecords('dispatch');
    } catch (error) {
      showToast(error?.message === 'no_eligible_technicians' ? 'No eligible field technicians are configured.' : 'Assignment unavailable. Check technician skills and conflicts.');
    } finally {
      button.disabled = false;
    }
  }, true);
})();
