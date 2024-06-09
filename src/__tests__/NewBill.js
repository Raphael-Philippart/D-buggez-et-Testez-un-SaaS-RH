/**
 * @jest-environment jsdom
 */

import { screen, fireEvent, waitFor } from "@testing-library/dom";
import NewBillUI from "../views/NewBillUI.js";
import NewBill from "../containers/NewBill.js";
import { ROUTES_PATH, ROUTES } from "../constants/routes.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import router from "../app/Router.js"

describe("Given I am connected as an employee", () => {
  describe("When I am on NewBill Page", () => {
    beforeEach(() => {
      document.body.innerHTML = '';  // Clear the DOM before each test
      Object.defineProperty(window, 'localStorage', { value: localStorageMock });
      window.localStorage.setItem('user', JSON.stringify({ type: 'Employee' }));
      const root = document.createElement("div");
      root.setAttribute("id", "root");
      document.body.append(root);
      router();
      window.onNavigate(ROUTES_PATH.NewBill);
    });

    test("Then the form should be submitted successfully", () => {
      document.body.innerHTML = NewBillUI();
      const onNavigate = (pathname) => { document.body.innerHTML = ROUTES({ pathname }) };

      const newBill = new NewBill({
        document, onNavigate, store: null, localStorage: window.localStorage
      });

      const handleSubmit = jest.fn(newBill.handleSubmit);
      const form = screen.getByTestId("form-new-bill");
      form.addEventListener("submit", handleSubmit);

      fireEvent.submit(form);
      expect(handleSubmit).toHaveBeenCalled();
    });

    test("Then changing the file should validate the file type and display an error for invalid files", async () => {
      document.body.innerHTML = NewBillUI();
      const onNavigate = jest.fn();
      const store = null;
      const localStorage = window.localStorage;

      const newBill = new NewBill({
        document, onNavigate, store, localStorage
      });

      const mockAlert = jest.spyOn(window, 'alert').mockImplementation(() => {});

      const fileInput = screen.getByTestId("file");

      // Trigger change event on file input with an invalid file extension
      const invalidFileExtension = new File(['dummy content'], 'test.txt', { type: 'text/plain' });
      fireEvent.change(fileInput, { target: { files: [invalidFileExtension] } });
      await waitFor(() => expect(mockAlert).toHaveBeenCalledWith('Invalid file type. Please select a .jpg, .jpeg, or .png file.'));

      // Clear the mock alert calls
      mockAlert.mockClear();

      // Trigger change event on file input with a valid file
      const validFile = new File(['dummy content'], 'test.png', { type: 'image/png' });
      fireEvent.change(fileInput, { target: { files: [validFile] } });
      await waitFor(() => expect(mockAlert).not.toHaveBeenCalled());
    });

    test("Then after submitting the form, the user should be redirected to Bills page", () => {
      document.body.innerHTML = NewBillUI();
      const onNavigate = jest.fn();

      const newBill = new NewBill({
        document, onNavigate, store: null, localStorage: window.localStorage
      });

      const handleSubmit = jest.fn(newBill.handleSubmit);
      const form = screen.getByTestId("form-new-bill");
      form.addEventListener("submit", handleSubmit);

      fireEvent.submit(form);
      expect(handleSubmit).toHaveBeenCalled();
      expect(onNavigate).toHaveBeenCalledWith(ROUTES_PATH.Bills);
    });

    test("Then if the store is null, updateBill should not be called", async () => {
      const updateBillMock = jest.fn();
      const newBill = new NewBill({
        document, onNavigate: jest.fn(), store: null, localStorage: window.localStorage
      });

      newBill.updateBill = updateBillMock;

      const handleSubmit = jest.fn(newBill.handleSubmit);
      const form = screen.getByTestId("form-new-bill");
      form.addEventListener("submit", handleSubmit);

      fireEvent.submit(form);
      await waitFor(() => expect(updateBillMock).not.toHaveBeenCalled());
    });

    test("Then if the store is defined, updateBill should be called", async () => {
      const store = {
        bills: jest.fn(() => ({
          update: jest.fn().mockResolvedValue({}),
        })),
      };
      const newBill = new NewBill({
        document, onNavigate: jest.fn(), store, localStorage: window.localStorage
      });

      const updateBillMock = jest.fn(newBill.updateBill);
      newBill.updateBill = updateBillMock;

      const handleSubmit = jest.fn(newBill.handleSubmit);
      const form = screen.getByTestId("form-new-bill");
      form.addEventListener("submit", handleSubmit);

      fireEvent.submit(form);
      await waitFor(() => expect(updateBillMock).toHaveBeenCalled());
    });

    test("Then if an error occurs during updateBill, it should be caught", async () => {
      document.body.innerHTML = NewBillUI(); // Ensure we start with a clean DOM
      const onNavigate = jest.fn();
      const store = {
        bills: jest.fn(() => ({
          update: jest.fn().mockRejectedValue(new Error("Test error")),
        })),
      };
      const newBill = new NewBill({
        document, onNavigate, store, localStorage: window.localStorage
      });

      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      const handleSubmit = jest.fn(newBill.handleSubmit);
      const form = screen.getByTestId("form-new-bill");
      form.addEventListener("submit", handleSubmit);

      fireEvent.submit(form);
      await waitFor(() => expect(consoleErrorSpy).toHaveBeenCalledWith(new Error("Test error")));

      consoleErrorSpy.mockRestore();
    });
  });

  describe("When I submit a new bill", () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <div id="root">
          <form data-testid="form-new-bill">
            <input data-testid="datepicker" value="2024-01-01" />
            <select data-testid="expense-type">
              <option value="Transports">Transports</option>
            </select>
            <input data-testid="expense-name" value="Flight ticket" />
            <input data-testid="amount" value="150" />
            <input data-testid="vat" value="30" />
            <input data-testid="pct" value="20" />
            <textarea data-testid="commentary">Conference trip</textarea>
            <input data-testid="file" />
            <button type="submit">Submit</button>
          </form>
        </div>
      `;

      localStorage.setItem("user", JSON.stringify({ email: "test@example.com" }));
    });

    test("Then it should call handleSubmit and navigate to Bills page", () => {
      const onNavigate = jest.fn();
      const store = {
        bills: jest.fn(() => ({
          update: jest.fn().mockResolvedValue({}),
        })),
      };

      const newBill = new NewBill({
        document,
        onNavigate,
        store,
        localStorage: window.localStorage
      });

      // Spy on the handleSubmit method
      const handleSubmitSpy = jest.spyOn(newBill, 'handleSubmit');

      // Ensure updateBill is called correctly
      newBill.updateBill = jest.fn();

      // Attach the event listener to the form manually
      const form = screen.getByTestId("form-new-bill");
      form.addEventListener("submit", newBill.handleSubmit);

      // Debugging
      console.log('form', form);
      console.log('handleSubmitSpy', handleSubmitSpy);

      // Simulate form submission
      fireEvent.submit(form);

      // Verify if handleSubmit was called
      expect(handleSubmitSpy).toHaveBeenCalled();

      // Verify if updateBill was called
      expect(newBill.updateBill).toHaveBeenCalled();

      // Verify if onNavigate was called with the correct path
      expect(onNavigate).toHaveBeenCalledWith(ROUTES_PATH.Bills);
    });
  });
});
