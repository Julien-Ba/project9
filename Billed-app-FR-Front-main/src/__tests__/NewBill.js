/**
 * @jest-environment jsdom
 */

import { screen, fireEvent, waitFor } from "@testing-library/dom";
import NewBillUI from "../views/NewBillUI.js";
import NewBill from "../containers/NewBill.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import mockStore from "../__mocks__/store";
import { ROUTES, ROUTES_PATH } from "../constants/routes.js";
import router from "../app/Router.js";

describe("Given I am connected as an employee", () => {
    describe("When I am on NewBill Page", () => {

        beforeEach(() => {
            Object.defineProperty(window, "localStorage", {
                value: localStorageMock,
            });
            window.localStorage.setItem(
                "user",
                JSON.stringify({
                    type: "Employee",
                    email: "employee@test.tld",
                })
            );
            const root = document.createElement("div");
            root.setAttribute("id", "root");
            document.body.append(root);
            router();
        });

        afterEach(() => {
            document.body.innerHTML = "";
        });

        test("Then mail icon on vertical layout should be highlighted", async () => {
            window.onNavigate(ROUTES_PATH.NewBill);
            await waitFor(() => screen.getByTestId("icon-mail"));
            const windowIcon = screen.getByTestId("icon-mail");
            expect(windowIcon.classList.contains("active-icon")).toBeTruthy();
        });

        test("Then the NewBill form should be rendered correctly", () => {
            window.onNavigate(ROUTES_PATH.NewBill);
            expect(screen.getByTestId("form-new-bill")).toBeTruthy();
            expect(screen.getByTestId("expense-type")).toBeTruthy();
            expect(screen.getByTestId("expense-name")).toBeTruthy();
            expect(screen.getByTestId("datepicker")).toBeTruthy();
            expect(screen.getByTestId("amount")).toBeTruthy();
            expect(screen.getByTestId("vat")).toBeTruthy();
            expect(screen.getByTestId("pct")).toBeTruthy();
            expect(screen.getByTestId("commentary")).toBeTruthy();
            expect(screen.getByTestId("file")).toBeTruthy();
        });

        describe("When I select a file to upload", () => {
            test("Then it accepts only jpg, jpeg, and png formats", () => {
                const onNavigate = jest.fn();
                const newBill = new NewBill({
                    document,
                    onNavigate,
                    store: mockStore,
                    localStorage: window.localStorage,
                });
                const file = screen.getByTestId("file");
                const handleChangeFile = jest.fn(newBill.handleChangeFile);
                file.addEventListener("change", handleChangeFile);

                // Test with a valid file (jpg)
                fireEvent.change(file, {
                    target: {
                        files: [
                            new File(["file contents"], "document.jpg", {
                                type: "image/jpeg",
                            }),
                        ],
                    },
                });
                expect(handleChangeFile).toHaveBeenCalled();
                expect(file.files[0].name).toBe("document.jpg");

                // Test with an invalid file (pdf)
                const alertMock = jest
                    .spyOn(window, "alert")
                    .mockImplementation(() => { });
                fireEvent.change(file, {
                    target: {
                        files: [
                            new File(["file contents"], "document.pdf", {
                                type: "application/pdf",
                            }),
                        ],
                    },
                });
                expect(alertMock).toHaveBeenCalledWith(
                    "Please upload a file in jpg, jpeg, or png format."
                );
                expect(file.value).toBe("");

                alertMock.mockRestore();
            });
        });

        test("Then I can submit the form", async () => {
            document.body.innerHTML = NewBillUI();
            const onNavigate = (pathname) => {
                document.body.innerHTML = ROUTES({ pathname });
            };
            const newBill = new NewBill({
                document,
                onNavigate,
                store: mockStore,
                localStorage: window.localStorage,
            });

            const form = screen.getByTestId("form-new-bill");
            const handleSubmit = jest.fn(newBill.handleSubmit);
            form.addEventListener("submit", handleSubmit);

            fireEvent.submit(form);

            expect(handleSubmit).toHaveBeenCalled();
        });

        describe("When a new bill is submitted", () => {
            test("Then the bill should be created with the form data", async () => {
                const onNavigate = jest.fn();
                const newBill = new NewBill({
                    document,
                    onNavigate,
                    store: mockStore,
                    localStorage: window.localStorage,
                });
                const form = screen.getByTestId("form-new-bill");

                fireEvent.change(screen.getByTestId("expense-type"), { target: { value: "Transports" } });
                fireEvent.change(screen.getByTestId("expense-name"), { target: { value: "Test expense" } });
                fireEvent.change(screen.getByTestId("datepicker"), { target: { value: "2023-04-15" } });
                fireEvent.change(screen.getByTestId("amount"), { target: { value: "100" } });
                fireEvent.change(screen.getByTestId("vat"), { target: { value: "20" } });
                fireEvent.change(screen.getByTestId("pct"), { target: { value: "20" } });
                fireEvent.change(screen.getByTestId("commentary"), { target: { value: "Test comment" } });

                const handleSubmit = jest.spyOn(newBill, "handleSubmit");
                form.addEventListener("submit", handleSubmit);
                fireEvent.submit(form);

                expect(handleSubmit).toHaveBeenCalled();
                expect(onNavigate).toHaveBeenCalledWith(ROUTES_PATH["Bills"]);
            });

            describe("When bill creation fails", () => {
                test("Then an error should be logged", async () => {
                    document.body.innerHTML = NewBillUI();
                    const onNavigate = (pathname) => {
                        document.body.innerHTML = ROUTES({ pathname });
                    };
                    const errorMock = jest.fn();
                    console.error = errorMock;

                    const newBill = new NewBill({
                        document,
                        onNavigate,
                        store: {
                            bills: jest.fn().mockImplementation(() => {
                                return {
                                    create: jest.fn().mockRejectedValue(new Error("Erreur 500")),
                                };
                            }),
                        },
                        localStorage: window.localStorage,
                    });
                    const file = screen.getByTestId("file");
                    Object.defineProperty(file, "files", {
                        value: [new File(["test"], "test.jpg", { type: "image/jpeg" })],
                    });
                    await newBill.handleChangeFile({ preventDefault: jest.fn(), target: file });

                    expect(errorMock).toHaveBeenCalled();
                });
            })

        });
    });
});
