use candid::{CandidType, Decode, Deserialize, Encode, Principal};
use ic_stable_structures::{Storable, storable::Bound};
use std::borrow::Cow;

pub type TodoId = u64;

#[derive(Debug, CandidType, Deserialize, Clone, Ord, Eq, PartialEq, PartialOrd)]
pub struct Todo {
    pub id: TodoId,
    pub text: String,
    pub done: bool,
}

impl Storable for Todo {
    fn to_bytes(&'_ self) -> std::borrow::Cow<'_, [u8]> {
        Cow::Owned(Encode!(self).unwrap())
    }

    fn into_bytes(self) -> Vec<u8> {
        Encode!(&self).unwrap()
    }

    fn from_bytes(bytes: std::borrow::Cow<[u8]>) -> Self {
        Decode!(bytes.as_ref(), Self).unwrap()
    }

    const BOUND: Bound = Bound::Unbounded;
}

#[derive(Clone, Ord, Eq, PartialEq, PartialOrd)]
pub struct StorablePrincipal(pub Principal);

impl Storable for StorablePrincipal {
    fn to_bytes(&'_ self) -> std::borrow::Cow<'_, [u8]> {
        Cow::Owned(self.0.as_slice().to_vec())
    }

    fn into_bytes(self) -> Vec<u8> {
        self.0.as_slice().to_vec()
    }

    fn from_bytes(bytes: std::borrow::Cow<[u8]>) -> Self {
        Self(Principal::try_from_slice(bytes.as_ref()).unwrap())
    }

    const BOUND: Bound = Bound::Bounded {
        max_size: 29,
        is_fixed_size: true,
    };
}
