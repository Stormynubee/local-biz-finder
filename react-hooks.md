# React Hooks Reference (Latest - React 19)

This documentation provides an overview of the built-in Hooks in React, including the latest additions and improvements from React 19.

## 🚀 What's New in React 19 Hooks

React 19 introduces several new Hooks and a new API that behaves like a Hook to handle async transitions, forms, and resource loading.

### `useActionState` (New)
Allows you to manage state for Actions (functions using async transitions).
- **Purpose**: Handles common cases for Actions, returning the last result and a pending state.
- **Usage**:
  ```javascript
  const [state, submitAction, isPending] = useActionState(asyncAction, initialState);
  ```

### `useOptimistic` (New)
Enables showing optimistic UI updates during async mutations.
- **Purpose**: Immediately displays a "guessed" final state while a request is in progress, reverting automatically on failure.
- **Usage**:
  ```javascript
  const [optimisticValue, setOptimisticValue] = useOptimistic(currentState);
  ```

### `useFormStatus` (New - react-dom)
Provides access to information about a parent `<form>` without prop drilling.
- **Purpose**: Reads `pending`, `data`, `method`, and `action` from the nearest parent form.
- **Usage**:
  ```javascript
  const { pending, data, method, action } = useFormStatus();
  ```

### `use` API (New)
A new API to read resources (like Promises or Context) in render.
- **Unique Feature**: Unlike traditional Hooks, `use` can be called **conditionally** or inside loops.
- **Usage**:
  ```javascript
  const value = use(resource);
  ```

---

## 🛠️ Built-in React Hooks Categories

### State Hooks
State lets a component "remember" information like user input.
- **`useState`**: Declares a state variable that you can update directly.
- **`useReducer`**: Declares a state variable with update logic inside a reducer function.

### Context Hooks
Context lets a component receive information from distant parents without passing it as props.
- **`useContext`**: Reads and subscribes to a context.

### Ref Hooks
Refs let a component hold information that isn’t used for rendering (like a DOM node).
- **`useRef`**: Declares a ref.
- **`useImperativeHandle`**: Customizes the ref exposed by your component (rarely used).

### Effect Hooks
Effects let a component connect to and synchronize with external systems.
- **`useEffect`**: Connects a component to an external system.
- **`useLayoutEffect`**: Fires before the browser repaints the screen.
- **`useInsertionEffect`**: Fires before React makes changes to the DOM (for CSS libraries).

### Performance Hooks
- **`useMemo`**: Caches the result of an expensive calculation.
- **`useCallback`**: Caches a function definition.
- **`useTransition`**: Marks a state transition as non-blocking.
- **`useDeferredValue`**: Defers updating a non-critical part of the UI.

---

## 💎 Improvements in React 19

- **`ref` as a prop**: You can now access `ref` as a prop for function components directly. `forwardRef` is no longer required for new components.
- **Context as a provider**: You can render `<Context>` directly as a provider instead of `<Context.Provider>`.
- **Ref Cleanups**: Support for returning a cleanup function from `ref` callbacks.

---
*Generated from official React Documentation (react.dev) on May 16, 2026.*
