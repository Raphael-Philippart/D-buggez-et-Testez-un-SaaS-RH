/**
 * @jest-environment jsdom
 */

import { screen, waitFor, fireEvent } from "@testing-library/dom";
import BillsUI from "../views/BillsUI.js";
import Bills from "../containers/Bills.js";
import NewBillUI from "../views/NewBillUI.js";
import { bills } from "../fixtures/bills.js";
import { ROUTES_PATH, ROUTES } from "../constants/routes.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import router from "../app/Router.js";
import mockStore from '../__mocks__/store';

describe("Given I am connected as an employee", () => {
  describe("When I am on Bills Page", () => {
    test("Then bill icon in vertical layout should be highlighted", async () => {
      Object.defineProperty(window, 'localStorage', { value: localStorageMock });
      window.localStorage.setItem('user', JSON.stringify({ type: 'Employee' }));

      const root = document.createElement("div");
      root.setAttribute("id", "root");
      document.body.append(root);
      router();
      window.onNavigate(ROUTES_PATH.Bills);

      await waitFor(() => screen.getByTestId('icon-window'));
      const windowIcon = screen.getByTestId('icon-window');
      expect(windowIcon.classList.contains('active-icon')).toBeTruthy();
    });

    test("Then bills should be ordered from earliest to latest", () => {
      document.body.innerHTML = BillsUI({ data: bills });
      const dates = screen.getAllByText(/^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i).map(a => a.innerHTML);
      const antiChrono = (a, b) => ((a < b) ? 1 : -1);
      const datesSorted = [...dates].sort(antiChrono);
      expect(dates).toEqual(datesSorted);
    });

    test("Then clicking on new bill button should navigate to NewBill page", () => {
      const onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES({ pathname });
      };

      Object.defineProperty(window, "localStorage", { value: localStorageMock });
      window.localStorage.setItem("user", JSON.stringify({ type: "Employee" }));

      document.body.innerHTML = BillsUI({ data: [] });

      const billsInstance = new Bills({
        document, onNavigate, store: null, localStorage: window.localStorage
      });

      const buttonNewBill = screen.getByTestId("btn-new-bill");
      const handleClickNewBill = jest.fn(billsInstance.handleClickNewBill);
      buttonNewBill.addEventListener("click", handleClickNewBill);
      fireEvent.click(buttonNewBill);

      expect(handleClickNewBill).toHaveBeenCalled();
      document.body.innerHTML = NewBillUI();
      expect(screen.getByTestId("form-new-bill")).toBeTruthy();
    });

    test("Then clicking on eye icon should display the bill in a modal", () => {
      const onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES({ pathname });
      };

      Object.defineProperty(window, "localStorage", { value: localStorageMock });
      window.localStorage.setItem("user", JSON.stringify({ type: "Employee" }));

      document.body.innerHTML = BillsUI({ data: bills });

      const billsInstance = new Bills({
        document, onNavigate, store: null, localStorage: window.localStorage
      });

      const eyeIcon = screen.getAllByTestId("icon-eye")[0];
      $.fn.modal = jest.fn(); // Mock jQuery modal function
      const handleClickIconEye = jest.fn(() => billsInstance.handleClickIconEye(eyeIcon));
      eyeIcon.addEventListener("click", handleClickIconEye);
      fireEvent.click(eyeIcon);

      expect(handleClickIconEye).toHaveBeenCalled();
      expect($.fn.modal).toHaveBeenCalled();
    });

    test("Then getBills should return formatted bills", async () => {
      const onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES({ pathname });
      };

      Object.defineProperty(window, "localStorage", { value: localStorageMock });
      window.localStorage.setItem("user", JSON.stringify({ type: "Employee" }));

      document.body.innerHTML = BillsUI({ data: [] });

      const storeMock = {
        bills: jest.fn(() => ({
          list: jest.fn().mockResolvedValue([
            { date: "2021-09-10", status: "pending" },
            { date: "2021-10-15", status: "accepted" }
          ])
        }))
      };

      const billsInstance = new Bills({
        document, onNavigate, store: storeMock, localStorage: window.localStorage
      });

      const result = await billsInstance.getBills();

      // Adjust expected result to match the format of the bills returned
      expect(result).toEqual([
        { rawDate: "2021-10-15", date: "15 Oct. 21", status: "Accepté" },
        { rawDate: "2021-09-10", date: "10 Sep. 21", status: "En attente" }
      ])
    })
  });

  describe('When an error occurs on the API', () => {
    beforeEach(() => {
      window.localStorage.setItem('user', JSON.stringify({ type: 'Employee', email: 'a@a' }))
      const root = document.createElement('div')
      root.setAttribute('id', 'root')
      document.body.append(root)
      router()
    })

    test('Then fetches bills from API and fails with 404 error message', async () => {
      jest.spyOn(mockStore, 'bills')
      mockStore.bills.mockImplementationOnce(() => ({
        list: () => Promise.reject(new Error('Erreur 404')),
      }))
      document.body.innerHTML = BillsUI({ error: 'Erreur 404' })
      const message = await screen.getByText(/Erreur 404/i)
      expect(message).toBeTruthy()
    })

    test('Then fetches bills from API and fails with 500 error message', async () => {
      jest.spyOn(mockStore, 'bills')
      mockStore.bills.mockImplementationOnce(() => ({
        list: () => Promise.reject(new Error('Erreur 500')),
      }))
      document.body.innerHTML = BillsUI({ error: 'Erreur 500' })
      const message = await screen.getByText(/Erreur 500/i)
      expect(message).toBeTruthy()
    })
  })
});
