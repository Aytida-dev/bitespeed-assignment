import express, { Request, Response } from "express";
import { ApiRes, Contact, Customer } from "./types";
import CustomerModel from "./customer.model";

const app = express();
const PORT = 5000;

app.use(express.json());

app.get("/", (req: Request, res: Response) => {
  res.send({
    msgg: "Welcome to my assigment for Bitespeed backend role",
    name: "Aditya raj",
    email: "aytida.dev@gmail.com",
    linkedIn: "https://www.linkedin.com/in/rayzr",
  });
});

app.post("/identify", async (req: Request, res: Response) => {
  const { email, phoneNumber }: { email: String, phoneNumber: String } = req.body

  if ((!email && !phoneNumber) || (phoneNumber && typeof phoneNumber !== "string")) {
    res.status(400).send({
      message: "Email or phone number is required and number should be a string"
    })
    return
  }

  try {

    let customersArr: Customer[] = []

    const data = await CustomerModel.getSpecificCustomer(email, phoneNumber)

    if (!data.length) {
      const customer: Customer = new CustomerModel(req.body)
      customer.linkedId = null
      customer.linkPrecedence = "primary"
      customer.createdAt = new Date()
      customer.updatedAt = new Date()

      customer.id = await CustomerModel.create(customer)

      customersArr.push(customer)

      console.log("Creating new primary");

    }
    else if (data.length === 1) {
      const customer = data[0]

      if (email && phoneNumber && (customer.email !== email || customer.phoneNumber !== phoneNumber)) {

        const newCustomer: Customer = new CustomerModel({} as Customer)
        newCustomer.createdAt = new Date()
        newCustomer.linkPrecedence = "secondary"
        newCustomer.updatedAt = new Date()

        if (customer.email !== email) {
          newCustomer.email = email
        }
        else {
          newCustomer.phoneNumber = phoneNumber
        }

        if (customer.linkPrecedence === "primary") {
          newCustomer.linkedId = customer.id
        }
        else {
          newCustomer.linkedId = customer.linkedId
        }

        newCustomer.id = await CustomerModel.create(newCustomer)

        console.log("Creating new secondary , data = 1");

      }

    }
    else {
      const formattedData: { primary: Customer[], secondary: Customer[] } = {
        primary: [],
        secondary: []
      }
      const linkedIds: Set<Number> = new Set()

      for (const customer of data) {
        formattedData[customer.linkPrecedence].push(customer)
        linkedIds.add(customer.linkedId ?? customer.id)
      }

      //Different primaries
      if (linkedIds.size > 1 || formattedData.primary.length > 1) {

        console.log("Joining primaries");
        const allCustomers = await Promise.all(formattedData.secondary.map((customer) => {
          return CustomerModel.getPrimary(customer.linkedId)
        }))

        let primary1 = formattedData.primary[0] ?? allCustomers[0]
        let primary2 = formattedData.primary[1] ?? allCustomers[1] ?? allCustomers[0]

        const [mainPrimary, secondaryPrimary] = chooseMergingPrimary(primary1, primary2, email)


        await CustomerModel.joinPrimary(mainPrimary, secondaryPrimary)
        data[0] = mainPrimary

      }
    }

    if (!customersArr.length) {
      customersArr = await CustomerModel.getAllCustomer(data[0])
    }

    res.send(responseFormatter(customersArr))

  } catch (error) {
    console.log(error);

    res.status(500).send({
      message: "Some error occured please try again later"
    })
  }
})


app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

function responseFormatter(customers: Customer[]): ApiRes {
  const contact: Contact = {
    primaryContactId: customers[0].id,
    email: customers[0].email ? [customers[0].email] : [],
    phoneNumbers: customers[0].phoneNumber ? [customers[0].phoneNumber] : [],
    secondaryContactIds: []
  }

  for (let i = 1; i < customers.length; i++) {
    if (customers[i].email) {
      contact.email.push(customers[i].email);
    }

    if (customers[i].phoneNumber) {
      contact.phoneNumbers.push(customers[i].phoneNumber);
    }

    contact.secondaryContactIds.push(customers[i].id);
  }

  return { contact }
}

function chooseMergingPrimary(primary1: Customer, primary2: Customer, email: String): Customer[] {
  const result = []
  if (primary1.email === email) {
    result[0] = primary1
    result[1] = primary2
  }
  else {
    result[0] = primary2
    result[1] = primary1
  }

  return result
}
