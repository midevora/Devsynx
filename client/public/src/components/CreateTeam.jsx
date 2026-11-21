const CreateTeam = () => {
    const [teamData, setTeamData] = React.useState({
        team_name: '',
        project_id: '',
        team_head_id: '',
        member_ids: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        const payload = {
            ...teamData,
            member_ids: teamData.member_ids.split(',').map(id => id.trim())
        };

        try {
            const response = await fetch('/api/create-team', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (response.ok) alert("✅ Team successfully deployed to DevSynx!");
        } catch (err) {
            alert("❌ Error connecting to DevSynx server.");
        }
    };

    return (
        <div className="ds-container">
            <div className="ds-form-card">
                <div className="ds-header">
                    <h2>DevSynx <span className="highlight">Manager Console</span></h2>
                    <p>Create a new software development team</p>
                </div>

                <form className="ds-form" onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label>Team Name</label>
                        <input type="text" placeholder="e.g. Blue-Squad" required
                            onChange={e => setTeamData({...teamData, team_name: e.target.value})} />
                    </div>

                    <div className="input-row">
                        <div className="input-group">
                            <label>Project ID</label>
                            <input type="number" placeholder="101" required
                                onChange={e => setTeamData({...teamData, project_id: e.target.value})} />
                        </div>
                        <div className="input-group">
                            <label>Team Head ID</label>
                            <input type="number" placeholder="5" required
                                onChange={e => setTeamData({...teamData, team_head_id: e.target.value})} />
                        </div>
                    </div>

                    <div className="input-group">
                        <label>Member IDs (Comma Separated)</label>
                        <textarea placeholder="e.g. 10, 15, 22" required
                            onChange={e => setTeamData({...teamData, member_ids: e.target.value})} />
                    </div>

                    <button type="submit" className="ds-btn">Initialize Team</button>
                </form>
            </div>
        </div>
    );
};

window.CreateTeam = CreateTeam;