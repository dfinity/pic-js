use candid::{CandidType, Deserialize, Principal};
use ic_cdk::{api::msg_caller, query, update};
use stable_memory::{TODO_ID, TODO_OWNERS_INDEX, TODOS};
use types::{StorablePrincipal, Todo, TodoId};

mod stable_memory;
mod types;

fn assert_caller_is_not_anonymous() -> Principal {
    let principal = msg_caller();

    assert_ne!(
        principal,
        Principal::anonymous(),
        "Anonymous principals are not allowed to call this method"
    );

    principal
}

fn assert_caller_owns_todo(calling_principal: Principal, id: TodoId) {
    TODO_OWNERS_INDEX.with(|todo_owners| {
        let todo_owners = todo_owners.borrow();
        let owns_todo = todo_owners.contains_key(&(StorablePrincipal(calling_principal), id));

        assert!(
            owns_todo,
            "Caller with principal {} does not own todo with id {}",
            calling_principal.to_text(),
            id
        );
    });
}

#[derive(CandidType, Deserialize)]
struct CreateTodoRequest {
    text: String,
}

#[derive(CandidType, Deserialize)]
struct CreateTodoResponse {
    id: TodoId,
}

#[update]
fn create_todo(payload: CreateTodoRequest) -> CreateTodoResponse {
    assert_caller_is_not_anonymous();

    let next_id = TODO_ID.with(|id| id.borrow().get() + 1);
    TODO_ID.with(|id| id.borrow_mut().set(next_id));

    let todo = Todo {
        id: next_id,
        text: payload.text,
        done: false,
    };

    TODO_OWNERS_INDEX.with(|todo_owners| {
        todo_owners
            .borrow_mut()
            .insert((StorablePrincipal(msg_caller()), next_id), ())
    });
    TODOS.with(|todos| todos.borrow_mut().insert(next_id, todo));

    CreateTodoResponse { id: next_id }
}

#[derive(CandidType, Deserialize)]
struct GetTodoResponse {
    todos: Vec<Todo>,
}

#[query]
fn get_todos() -> GetTodoResponse {
    let calling_principal = assert_caller_is_not_anonymous();

    let owned_todo_ids = TODO_OWNERS_INDEX.with(|todo_owners| {
        todo_owners
            .borrow()
            .range(
                (StorablePrincipal(calling_principal), TodoId::MIN)
                    ..(StorablePrincipal(calling_principal), TodoId::MAX),
            )
            .map(|entry| entry.key().1)
            .collect::<Vec<_>>()
    });

    let owned_todos = TODOS.with(|todos| {
        let todos = todos.borrow();

        owned_todo_ids
            .iter()
            .filter_map(|id| todos.get(id))
            .collect::<Vec<_>>()
    });

    GetTodoResponse { todos: owned_todos }
}

#[derive(CandidType, Deserialize)]
struct UpdateTodoRequest {
    text: Option<String>,
    done: Option<bool>,
}

#[update]
fn update_todo(id: TodoId, payload: UpdateTodoRequest) {
    let calling_principal = assert_caller_is_not_anonymous();
    assert_caller_owns_todo(calling_principal, id);

    TODOS.with(|todos| {
        let mut todos = todos.borrow_mut();

        let mut todo = todos
            .get(&id)
            .unwrap_or_else(|| panic!("Todo with id {} does not exist", id));

        if let Some(text) = payload.text {
            todo.text = text;
        }

        if let Some(done) = payload.done {
            todo.done = done;
        }

        todos.insert(id, todo);
    });
}

#[update]
fn delete_todo(id: TodoId) {
    let calling_principal = assert_caller_is_not_anonymous();
    assert_caller_owns_todo(calling_principal, id);

    TODOS.with(|todos| {
        let mut todos = todos.borrow_mut();

        todos.remove(&id);
    });
}
