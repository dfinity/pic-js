use candid::{CandidType, Principal};
use governance::{ListProposalInfo, Service as GovernanceService};
use ic_cdk::*;

mod governance;

const GOVERNANCE_CANISTER_ID: &str = "rrkah-fqaaa-aaaaa-aaaaq-cai";

#[derive(CandidType)]
struct NeuronId {
    id: u64,
}

#[derive(CandidType)]
struct ProposalInfo {
    id: Option<NeuronId>,
    status: i32,
    title: Option<String>,
    summary: Option<String>,
}

#[update]
async fn get_pending_proposals() -> Vec<ProposalInfo> {
    let governance_principal = Principal::from_text(GOVERNANCE_CANISTER_ID).unwrap();
    let governance_service = GovernanceService(governance_principal);

    let (proposals,) = governance_service
        .list_proposals(ListProposalInfo {
            before_proposal: None,
            exclude_topic: vec![],
            include_reward_status: vec![0, 1, 2, 3, 4, 5],
            include_status: vec![1],
            include_all_manage_neuron_proposals: None,
            omit_large_fields: None,
            limit: 100,
        })
        .await
        .unwrap();

    proposals
        .proposal_info
        .into_iter()
        .map(|proposal| ProposalInfo {
            id: proposal.id.map(|neuron_id| NeuronId { id: neuron_id.id }),
            status: proposal.status,
            title: proposal.proposal.as_ref().and_then(|s| s.title.clone()),
            summary: proposal.proposal.as_ref().map(|s| s.summary.clone()),
        })
        .collect()
}
