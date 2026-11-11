# Use official Maven image for building
FROM maven:3.9-eclipse-temurin-17-alpine as builder

# Set the working directory inside the container
WORKDIR /app

# Copy the pom.xml
COPY pom.xml .

# Download dependencies (this layer is cached unless pom.xml changes)
RUN mvn dependency:go-offline

# Copy the project source code
COPY src ./src

# Build the application skipping tests
RUN mvn clean package -DskipTests

# Run stage
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# Copy the built jar from the builder stage
COPY --from=builder /app/target/*.jar app.jar

# Expose the default Spring Boot port
EXPOSE 8080

# Command to run the application
ENTRYPOINT ["java", "-jar", "app.jar"]
