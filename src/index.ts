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
  try {

    let customersArr: Customer[] = []

    const data = await CustomerModel.getSpecificCustomer(email, phoneNumber)

    if (!data.length) {
      const customer: Customer = new CustomerModel(req.body)
      customer.linkedId = null
      customer.linkPrecedence = "primary"
      customer.createdAt = new Date()

      customer.id = await CustomerModel.create(customer)

      customersArr.push(customer)

    }
    else if (data.length === 1) {
      const customer = data[0]

      if (email && phoneNumber && (customer.email !== email || customer.phoneNumber !== phoneNumber)) {

        const newCustomer: Customer = new CustomerModel({} as Customer)
        newCustomer.createdAt = new Date()
        newCustomer.linkPrecedence = "secondary"

        if (customer.email !== email) {
          newCustomer.email = email
        }
        else {
          newCustomer.phoneNumber = phoneNumber
        }

        if (customer.linkPrecedence === "primary") {
          customer.linkedId = customer.id
        }
        else {
          customer.linkedId = customer.linkedId
        }

        newCustomer.id = await CustomerModel.create(newCustomer)
      }

    }
    else {
      const formattedData: { primary: Customer[], secondary: Customer[] } = {
        primary: [],
        secondary: []
      }
      const linkedIds: Set<Number> = new Set()
      const newDataCheck = [0, 0]  //[email , phone]

      for (const customer of data) {
        formattedData[customer.linkPrecedence].push(customer)
        linkedIds.add(customer.linkedId ?? customer.id)

        if (customer.email === email) {
          newDataCheck[0]++
        }
        if (customer.phoneNumber === phoneNumber) {
          newDataCheck[1]++
        }
      }

      //all same primary
      if (linkedIds.size < 2 && formattedData.primary.length < 2) {
        if (!newDataCheck[0]) {
          const newCustomer: Customer = new CustomerModel({} as Customer)
          newCustomer.createdAt = new Date()
          newCustomer.linkPrecedence = "secondary"
          newCustomer.email = email

          newCustomer.linkedId = formattedData.primary.length ? formattedData.primary[0].id : formattedData.secondary[0].linkedId

          await CustomerModel.create(newCustomer)
          return
        }
        else if (!newDataCheck[1]) {
          const newCustomer: Customer = new CustomerModel({} as Customer)
          newCustomer.createdAt = new Date()
          newCustomer.linkPrecedence = "secondary"
          newCustomer.phoneNumber = phoneNumber

          newCustomer.linkedId = formattedData.primary.length ? formattedData.primary[0].id : formattedData.secondary[0].linkedId

          await CustomerModel.create(newCustomer)
          return
        }

      }
      else {
        let primary1 = formattedData.primary[0] ?? await CustomerModel.getPrimary(formattedData.secondary[0].linkedId)
        let primary2 = formattedData.primary[1] ?? await CustomerModel.getPrimary(formattedData.secondary[1].linkedId)

        await CustomerModel.joinPrimary(primary1, primary2)
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
    email: [customers[0].email],
    phoneNumbers: [customers[0].phoneNumber],
    secondaryContactIds: []
  }

  for (let i = 1; i < customers.length; i++) {
    contact.secondaryContactIds.push(customers[i].id);
  }

  return { contact }
}
